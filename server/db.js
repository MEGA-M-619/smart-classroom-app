import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.dirname(config.databasePath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');

function applyMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime(\'now\')));');
  if (!fs.existsSync(migrationsDir)) return;
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name));
  for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
      db.exec('COMMIT');
      logger.info('applied migration', { file });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher','admin')),
      avatar TEXT,
      department TEXT,
      major TEXT,
      year TEXT,
      phone TEXT,
      bio TEXT,
      dark_mode INTEGER DEFAULT 0,
      email_notifications INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT '📚',
      semester TEXT,
      description TEXT,
      schedule TEXT,
      room TEXT,
      max_students INTEGER DEFAULT 50,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, class_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      points INTEGER DEFAULT 100,
      status TEXT DEFAULT 'active',
      type TEXT DEFAULT 'Assignment',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT,
      file_path TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      grade REAL,
      feedback TEXT,
      status TEXT DEFAULT 'submitted',
      UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'pdf',
      file_name TEXT,
      file_path TEXT,
      size_bytes INTEGER DEFAULT 0,
      icon TEXT DEFAULT '📄',
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'event',
      color TEXT DEFAULT '#6366f1',
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      icon TEXT DEFAULT '🔔',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  applyMigrations();
}

export function userPublic(row) {
  if (!row) return null;
  const rest = { ...row };
  delete rest.password_hash;
  return {
    id: rest.id,
    name: rest.name,
    email: rest.email,
    role: rest.role,
    avatar: rest.avatar || row.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
    department: rest.department,
    major: rest.major,
    year: rest.year,
    phone: rest.phone,
    bio: rest.bio,
    darkMode: !!rest.dark_mode,
    emailNotifications: rest.email_notifications !== 0,
    onboardingComplete: !!rest.onboarding_complete,
    createdAt: rest.created_at,
  };
}

export function classWithMeta(cls, teacherName, studentCount) {
  return {
    id: cls.id,
    name: cls.name,
    code: cls.code,
    teacherId: cls.teacher_id,
    teacher: teacherName,
    color: cls.color,
    icon: cls.icon,
    students: studentCount,
    semester: cls.semester,
    description: cls.description,
    schedule: cls.schedule,
    room: cls.room,
    maxStudents: cls.max_students,
    inviteToken: cls.invite_token || null,
  };
}
