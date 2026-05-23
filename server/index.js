import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { db, initSchema, userPublic, classWithMeta } from './db.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { corsOptions, createRateLimiter, errorHandler, notFound, requestLogger, securityHeaders } from './middleware.js';
import { assertDate, assertEmail, assertPassword, assertRole, asPositiveNumber, cleanString, requireFields } from './validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = config.port;
const HOST = config.host;

function getNetworkAddresses() {
  const addresses = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces || []) {
      if (net.family === 'IPv4' && !net.internal) addresses.push(net.address);
    }
  }
  return addresses;
}
const JWT_SECRET = config.jwtSecret;
const uploadsDir = config.uploadDir;
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

initSchema();
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0 && config.seedOnEmpty) {
  await import('./seed.js');
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: config.maxUploadMb * 1024 * 1024 } });

export const app = express();
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(requestLogger);
app.use(createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }));
app.use(cors(corsOptions()));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: config.isProduction ? '7d' : 0 }));
app.get('/api/health', (_req, res) => res.json({ ok: true, env: config.env, time: new Date().toISOString() }));

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function getTeacherName(id) {
  return db.prepare('SELECT name FROM users WHERE id = ?').get(id)?.name || 'Unknown';
}

function studentCount(classId) {
  return db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE class_id = ?').get(classId).c;
}

function mapClass(cls) {
  return classWithMeta(cls, getTeacherName(cls.teacher_id), studentCount(cls.id));
}

function mapAssignment(a) {
  const subs = db.prepare('SELECT COUNT(*) as c FROM submissions WHERE assignment_id = ?').get(a.id).c;
  return {
    id: a.id,
    classId: a.class_id,
    title: a.title,
    description: a.description,
    dueDate: a.due_date,
    points: a.points,
    status: a.status,
    submissions: subs,
    type: a.type,
  };
}

function pointsToGpa(percent) {
  if (percent >= 93) return 4.0;
  if (percent >= 90) return 3.7;
  if (percent >= 87) return 3.3;
  if (percent >= 83) return 3.0;
  if (percent >= 80) return 2.7;
  if (percent >= 77) return 2.3;
  if (percent >= 73) return 2.0;
  if (percent >= 70) return 1.7;
  if (percent >= 67) return 1.3;
  if (percent >= 63) return 1.0;
  if (percent >= 60) return 0.7;
  return 0;
}

function calculateStudentGpa(studentId) {
  const rows = db.prepare(`
    SELECT s.grade, a.points
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE s.student_id = ? AND s.status = 'graded' AND s.grade IS NOT NULL AND a.points > 0
  `).all(studentId);
  if (!rows.length) return null;
  const total = rows.reduce((sum, row) => sum + pointsToGpa((Number(row.grade) / Number(row.points)) * 100), 0);
  return Number((total / rows.length).toFixed(2));
}

function mapAnnouncement(a) {
  const author = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(a.author_id);
  const cls = db.prepare('SELECT color FROM classes WHERE id = ?').get(a.class_id);
  return {
    id: a.id,
    classId: a.class_id,
    title: a.title,
    body: a.body,
    teacher: author?.name,
    avatar: author?.avatar,
    date: a.created_at?.slice(0, 10),
    pinned: !!a.pinned,
    color: cls?.color || '#6366f1',
  };
}

function mapMaterial(m) {
  return {
    id: m.id,
    classId: m.class_id,
    title: m.title,
    type: m.type,
    size: formatSize(m.size_bytes || 0),
    date: m.uploaded_at?.slice(0, 10),
    icon: m.icon,
    filePath: m.file_path,
    fileName: m.file_name,
  };
}

function mapSubmission(s) {
  const student = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(s.student_id);
  return {
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    studentName: student?.name,
    avatar: student?.avatar,
    submittedAt: s.submitted_at,
    file: s.file_name,
    filePath: s.file_path,
    grade: s.grade,
    feedback: s.feedback,
    status: s.status,
  };
}

function notify(userId, text, icon = '🔔') {
  db.prepare('INSERT INTO notifications (user_id, text, icon) VALUES (?, ?, ?)').run(userId, text, icon);
}

function getClassEnrolledStudents(classId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar
    FROM users u
    JOIN enrollments e ON e.user_id = u.id
    WHERE e.class_id = ? AND u.role = 'student'
    ORDER BY u.name
  `).all(classId);
}

function mapAttendanceRecord(row, student) {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: student?.name,
    avatar: student?.avatar,
    status: row.status,
    note: row.note || '',
  };
}

function getAttendanceSession(classId, sessionDate) {
  return db.prepare('SELECT * FROM attendance_sessions WHERE class_id = ? AND session_date = ?').get(classId, sessionDate);
}

function buildAttendanceSummaryForStudent(studentId, classIds) {
  if (!classIds.length) return [];
  const ph = classIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT
      c.id as classId,
      c.name as className,
      c.code,
      c.color,
      c.icon,
      COUNT(ar.id) as totalSessions,
      SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as presentCount,
      SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absentCount,
      SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as lateCount
    FROM classes c
    JOIN attendance_sessions s ON s.class_id = c.id
    JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = ?
    WHERE c.id IN (${ph})
    GROUP BY c.id
    ORDER BY c.name
  `).all(studentId, ...classIds).map((row) => {
    const total = Number(row.totalSessions) || 0;
    const present = Number(row.presentCount) || 0;
    return {
      classId: row.classId,
      className: row.className,
      code: row.code,
      color: row.color,
      icon: row.icon,
      totalSessions: total,
      presentCount: present,
      absentCount: Number(row.absentCount) || 0,
      lateCount: Number(row.lateCount) || 0,
      percentage: total ? Math.round((present / total) * 100) : null,
    };
  });
}

function buildRecentAttendanceForStudent(studentId, limit = 20) {
  return db.prepare(`
    SELECT ar.id, ar.status, ar.note, s.session_date as date, c.id as classId, c.name as className, c.color
    FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id
    JOIN classes c ON c.id = s.class_id
    WHERE ar.student_id = ?
    ORDER BY s.session_date DESC
    LIMIT ?
  `).all(studentId, limit).map((row) => ({
    id: row.id,
    status: row.status,
    note: row.note || '',
    date: row.date,
    classId: row.classId,
    className: row.className,
    color: row.color,
  }));
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const email = cleanString(req.body.email, 320).toLowerCase();
  const { password } = req.body;
  assertEmail(email);
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const user = userPublic(row);
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: config.jwtExpiresIn });
  res.json({ token, user });
});

app.post('/api/auth/register', (req, res) => {
  requireFields(req.body, ['name', 'email', 'password']);
  const name = cleanString(req.body.name, 120);
  const email = cleanString(req.body.email, 320).toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role || 'student';
  const { phone, department, major, year, bio } = req.body;
  assertEmail(email);
  assertPassword(password);
  assertRole(role);
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already registered.' });
  const avatar = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const r = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, department, major, year, bio, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, bcrypt.hashSync(password, 10), role, phone || null, department || null, major || null, year || null, bio || null, avatar);
  const user = userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: config.jwtExpiresIn });
  res.status(201).json({ token, user });
});

app.get('/api/auth/me', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({ user: userPublic(row) });
});

// ─── Bootstrap (all data for logged-in user) ──────────────────────────────────
app.get('/api/bootstrap', auth, (req, res) => {
  const uid = req.user.id;
  const role = req.user.role;

  let classes;
  if (role === 'admin') {
    classes = db.prepare('SELECT * FROM classes ORDER BY id').all().map(mapClass);
  } else if (role === 'teacher') {
    classes = db.prepare('SELECT * FROM classes WHERE teacher_id = ? ORDER BY id').all(uid).map(mapClass);
  } else {
    classes = db.prepare(`
      SELECT c.* FROM classes c
      JOIN enrollments e ON e.class_id = c.id
      WHERE e.user_id = ? ORDER BY c.id
    `).all(uid).map(mapClass);
  }

  classes = classes || [];
  const classIds = classes.map((c) => c.id);
  let assignments = [];
  if (classIds.length) {
    const ph = classIds.map(() => '?').join(',');
    assignments = db.prepare(`SELECT * FROM assignments WHERE class_id IN (${ph}) ORDER BY due_date`).all(...classIds).map(mapAssignment);
  } else if (role === 'admin') {
    assignments = db.prepare('SELECT * FROM assignments ORDER BY due_date').all().map(mapAssignment);
  }

  let announcements = [];
  if (classIds.length) {
    const ph = classIds.map(() => '?').join(',');
    announcements = db.prepare(`SELECT * FROM announcements WHERE class_id IN (${ph}) ORDER BY created_at DESC`).all(...classIds).map(mapAnnouncement);
  } else if (role === 'admin') {
    announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all().map(mapAnnouncement);
  }

  let materials = [];
  if (classIds.length) {
    const ph = classIds.map(() => '?').join(',');
    materials = db.prepare(`SELECT * FROM materials WHERE class_id IN (${ph}) ORDER BY uploaded_at DESC`).all(...classIds).map(mapMaterial);
  } else if (role === 'admin') {
    materials = db.prepare('SELECT * FROM materials ORDER BY uploaded_at DESC').all().map(mapMaterial);
  }

  const events = db.prepare('SELECT * FROM events ORDER BY date').all().map((e) => ({
    id: e.id, title: e.title, date: e.date, type: e.type, color: e.color,
  }));

  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(uid).map((n) => ({
    id: n.id, text: n.text, time: timeAgo(n.created_at), read: !!n.read, icon: n.icon,
  }));

  let submissions = [];
  if (role === 'teacher') {
    const teacherClassIds = classes.map((c) => c.id);
    if (teacherClassIds.length) {
      const ph = teacherClassIds.map(() => '?').join(',');
      const asgnIds = db.prepare(`SELECT id FROM assignments WHERE class_id IN (${ph})`).all(...teacherClassIds).map((a) => a.id);
      if (asgnIds.length) {
        const ph2 = asgnIds.map(() => '?').join(',');
        submissions = db.prepare(`SELECT * FROM submissions WHERE assignment_id IN (${ph2}) ORDER BY submitted_at DESC`).all(...asgnIds).map(mapSubmission);
      }
    }
  } else if (role === 'student') {
    submissions = db.prepare('SELECT * FROM submissions WHERE student_id = ? ORDER BY submitted_at DESC').all(uid).map(mapSubmission);
    const submissionsByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
    assignments = assignments.map((a) => {
      const submission = submissionsByAssignment.get(a.id);
      return {
        ...a,
        submitted: !!submission,
        submissionStatus: submission?.status || null,
        submissionGrade: submission?.grade ?? null,
        submissionFeedback: submission?.feedback || '',
        submittedAt: submission?.submittedAt || null,
      };
    });
  } else {
    submissions = db.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC LIMIT 100').all().map(mapSubmission);
  }

  const users = role === 'admin'
    ? db.prepare('SELECT * FROM users ORDER BY id').all().map(userPublic)
    : [];

  const settingsRows = role === 'admin'
    ? db.prepare('SELECT key, value FROM settings').all()
    : [];
  const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));

  let attendanceSummary = [];
  let attendanceRecent = [];
  if (role === 'student' && classIds.length) {
    attendanceSummary = buildAttendanceSummaryForStudent(uid, classIds);
    attendanceRecent = buildRecentAttendanceForStudent(uid);
  } else if (role === 'teacher') {
    attendanceSummary = classes.map((c) => {
      const totals = db.prepare(`
        SELECT
          COUNT(DISTINCT s.id) as sessions,
          COUNT(ar.id) as records,
          SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absences
        FROM attendance_sessions s
        LEFT JOIN attendance_records ar ON ar.session_id = s.id
        WHERE s.class_id = ?
      `).get(c.id);
      return {
        classId: c.id,
        className: c.name,
        code: c.code,
        color: c.color,
        icon: c.icon,
        totalSessions: Number(totals?.sessions) || 0,
        totalRecords: Number(totals?.records) || 0,
        absentCount: Number(totals?.absences) || 0,
      };
    });
  }

  const stats = {
    enrolledClasses: role === 'student' ? classes.length : undefined,
    pendingTasks: role === 'student' ? assignments.filter((a) => a.status === 'active' && !a.submitted).length : undefined,
    submittedCount: role === 'student' ? submissions.length : undefined,
    gradedCount: role === 'student' ? submissions.filter((s) => s.status === 'graded').length : undefined,
    gpa: role === 'student' ? calculateStudentGpa(uid) : undefined,
    attendancePercentage: role === 'student' && attendanceSummary.length
      ? Math.round(attendanceSummary.reduce((sum, row) => sum + (row.percentage || 0), 0) / attendanceSummary.length)
      : undefined,
    pendingGrades: role === 'teacher' ? submissions.filter((s) => s.status === 'submitted').length : undefined,
    totalStudents: role === 'teacher' ? classes.reduce((s, c) => s + c.students, 0) : undefined,
  };

  res.json({
    classes,
    assignments,
    announcements,
    materials,
    events,
    notifications,
    submissions,
    users,
    settings,
    stats,
    attendanceSummary,
    attendanceRecent,
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.patch('/api/users/me', auth, (req, res) => {
  const { name, email, phone, bio, darkMode, emailNotifications } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  db.prepare(`
    UPDATE users SET name=?, email=?, phone=?, bio=?, dark_mode=?, email_notifications=?
    WHERE id=?
  `).run(
    name ?? row.name, email ?? row.email, phone ?? row.phone, bio ?? row.bio,
    darkMode !== undefined ? (darkMode ? 1 : 0) : row.dark_mode,
    emailNotifications !== undefined ? (emailNotifications ? 1 : 0) : row.email_notifications,
    req.user.id,
  );
  res.json({ user: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

app.post('/api/users/me/password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

app.post('/api/users', auth, requireRole('admin'), (req, res) => {
  const { name, email, password, role, department, major, year, phone, bio } = req.body;
  const avatar = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const r = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, department, major, year, phone, bio, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, bcrypt.hashSync(password || 'changeme123', 10), role, department || null, major || null, year || null, phone || null, bio || null, avatar);
  res.status(201).json({ user: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid)) });
});

app.patch('/api/users/:id', auth, requireRole('admin'), (req, res) => {
  const { name, email, role, department, major, year, phone, bio } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE users SET name=?, email=?, role=?, department=?, major=?, year=?, phone=?, bio=? WHERE id=?`)
    .run(name ?? row.name, email ?? row.email, role ?? row.role, department ?? row.department, major ?? row.major, year ?? row.year, phone ?? row.phone, bio ?? row.bio, req.params.id);
  res.json({ user: userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)) });
});

app.delete('/api/users/:id', auth, requireRole('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Classes ──────────────────────────────────────────────────────────────────
app.post('/api/classes', auth, requireRole('teacher', 'admin'), (req, res) => {
  requireFields(req.body, ['name']);
  const name = cleanString(req.body.name, 160);
  const { description, schedule, room, semester, color, icon } = req.body;
  const code = (req.body.code || name.replace(/\s+/g, '').slice(0, 6).toUpperCase() + Math.floor(100 + Math.random() * 900)).toUpperCase();
  const teacherId = req.user.role === 'admin' && req.body.teacherId ? req.body.teacherId : req.user.id;
  const r = db.prepare(`
    INSERT INTO classes (name, code, teacher_id, color, icon, semester, description, schedule, room)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, code, teacherId, color || '#6366f1', icon || '📚', semester || 'Spring 2025', description || '', schedule || '', room || '');
  const cls = mapClass(db.prepare('SELECT * FROM classes WHERE id = ?').get(r.lastInsertRowid));
  res.status(201).json({ class: cls });
});

app.get('/api/classes/:classId/attendance', auth, (req, res) => {
  const classId = Number(req.params.classId);
  const sessionDate = cleanString(req.query.date || new Date().toISOString().slice(0, 10), 10);
  assertDate(sessionDate);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const allowed = req.user.role === 'admin'
    || cls.teacher_id === req.user.id
    || db.prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?').get(classId, req.user.id);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  const session = getAttendanceSession(classId, sessionDate);
  const students = getClassEnrolledStudents(classId);
  let records = [];
  if (session) {
    const rows = db.prepare('SELECT * FROM attendance_records WHERE session_id = ?').all(session.id);
    const byStudent = new Map(rows.map((row) => [row.student_id, row]));
    records = students.map((student) => {
      const row = byStudent.get(student.id);
      return row
        ? mapAttendanceRecord(row, student)
        : { studentId: student.id, studentName: student.name, avatar: student.avatar, status: 'present', note: '' };
    });
  } else if (req.user.role === 'teacher' || req.user.role === 'admin') {
    records = students.map((student) => ({
      studentId: student.id,
      studentName: student.name,
      avatar: student.avatar,
      status: 'present',
      note: '',
    }));
  }

  const history = db.prepare(`
    SELECT s.session_date as date, COUNT(ar.id) as total,
      SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as presentCount
    FROM attendance_sessions s
    LEFT JOIN attendance_records ar ON ar.session_id = s.id
    WHERE s.class_id = ?
    GROUP BY s.id
    ORDER BY s.session_date DESC
    LIMIT 30
  `).all(classId).map((row) => ({
    date: row.date,
    total: Number(row.total) || 0,
    presentCount: Number(row.presentCount) || 0,
    percentage: row.total ? Math.round((Number(row.presentCount) / Number(row.total)) * 100) : 0,
  }));

  res.json({ class: mapClass(cls), sessionDate, sessionId: session?.id || null, records, history });
});

app.post('/api/classes/:classId/attendance', auth, requireRole('teacher', 'admin'), (req, res) => {
  const classId = Number(req.params.classId);
  const sessionDate = cleanString(req.body.date || new Date().toISOString().slice(0, 10), 10);
  assertDate(sessionDate);
  const records = Array.isArray(req.body.records) ? req.body.records : [];
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (req.user.role === 'teacher' && cls.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  let session = getAttendanceSession(classId, sessionDate);
  if (!session) {
    const r = db.prepare('INSERT INTO attendance_sessions (class_id, session_date, created_by) VALUES (?, ?, ?)')
      .run(classId, sessionDate, req.user.id);
    session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(r.lastInsertRowid);
  }

  const allowedStatuses = new Set(['present', 'absent', 'late', 'excused']);
  const upsert = db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, status, note)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, student_id) DO UPDATE SET status = excluded.status, note = excluded.note
  `);

  for (const record of records) {
    const studentId = Number(record.studentId);
    const status = allowedStatuses.has(record.status) ? record.status : 'present';
    const enrolled = db.prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?').get(classId, studentId);
    if (!enrolled) continue;
    upsert.run(session.id, studentId, status, cleanString(record.note || '', 240));
    if (status === 'absent') {
      notify(studentId, `Marked absent for ${cls.name} on ${sessionDate}`, '📋');
    }
  }

  const students = getClassEnrolledStudents(classId);
  const savedRows = db.prepare('SELECT * FROM attendance_records WHERE session_id = ?').all(session.id);
  const byStudent = new Map(savedRows.map((row) => [row.student_id, row]));
  res.json({
    sessionId: session.id,
    sessionDate,
    records: students.map((student) => mapAttendanceRecord(byStudent.get(student.id) || {
      student_id: student.id,
      status: 'present',
      note: '',
    }, student)),
  });
});

app.post('/api/classes/join', auth, requireRole('student'), (req, res) => {
  requireFields(req.body, ['code']);
  const code = cleanString(req.body.code, 32).toUpperCase();
  const cls = db.prepare('SELECT * FROM classes WHERE UPPER(code) = UPPER(?)').get(code);
  if (!cls) return res.status(404).json({ error: 'Class not found. Check the code.' });
  const exists = db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND class_id = ?').get(req.user.id, cls.id);
  if (exists) return res.status(409).json({ error: 'Already enrolled in this class.' });
  const count = studentCount(cls.id);
  if (count >= cls.max_students) return res.status(400).json({ error: 'Class is full.' });
  db.prepare('INSERT INTO enrollments (user_id, class_id) VALUES (?, ?)').run(req.user.id, cls.id);
  const student = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const teacher = db.prepare('SELECT id FROM users WHERE id = ?').get(cls.teacher_id);
  notify(teacher.id, `${student.name} joined ${cls.name}`, '👤');
  res.json({ class: mapClass(cls) });
});

// ─── Assignments ──────────────────────────────────────────────────────────────
app.post('/api/assignments', auth, requireRole('teacher', 'admin'), (req, res) => {
  requireFields(req.body, ['classId', 'title', 'dueDate']);
  assertDate(req.body.dueDate);
  const classId = Number(req.body.classId);
  const title = cleanString(req.body.title, 180);
  const { description, dueDate, points, type, status } = req.body;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (req.user.role === 'teacher' && cls.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const r = db.prepare(`
    INSERT INTO assignments (class_id, title, description, due_date, points, type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(classId, title, description || '', dueDate, points || 100, type || 'Assignment', status || 'active');
  const a = mapAssignment(db.prepare('SELECT * FROM assignments WHERE id = ?').get(r.lastInsertRowid));
  const eventType = String(type || 'Assignment').toLowerCase() === 'quiz' ? 'quiz' : 'assignment';
  db.prepare(`INSERT INTO events (title, date, type, color, assignment_id, class_id) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(a.title, a.dueDate, eventType, cls.color, a.id, classId);
  const enrolled = db.prepare('SELECT user_id FROM enrollments WHERE class_id = ?').all(classId);
  for (const { user_id } of enrolled) {
    notify(user_id, `New assignment: ${title} in ${cls.name}`, '📝');
  }
  res.status(201).json({ assignment: a });
});

// ─── Submissions ──────────────────────────────────────────────────────────────
app.post('/api/assignments/:id/submit', auth, requireRole('student'), upload.single('file'), (req, res) => {
  const assignmentId = Number(req.params.id);
  const asgn = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  if (!asgn) return res.status(404).json({ error: 'Assignment not found' });
  const enrolled = db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND class_id = ?').get(req.user.id, asgn.class_id);
  if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this class' });
  const fileName = req.file?.originalname || req.body.fileName || 'submission.txt';
  const filePath = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
  const existing = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?').get(assignmentId, req.user.id);
  if (existing) {
    db.prepare(`UPDATE submissions SET file_name=?, file_path=?, submitted_at=datetime('now'), status='submitted', grade=NULL WHERE id=?`)
      .run(fileName, filePath, existing.id);
    res.json({ submission: mapSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(existing.id)) });
  } else {
    const r = db.prepare(`INSERT INTO submissions (assignment_id, student_id, file_name, file_path) VALUES (?, ?, ?, ?)`)
      .run(assignmentId, req.user.id, fileName, filePath);
    const sub = mapSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(r.lastInsertRowid));
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(asgn.class_id);
    notify(cls.teacher_id, `${sub.studentName} submitted ${asgn.title}`, '📬');
    res.status(201).json({ submission: sub });
  }
});

app.patch('/api/submissions/:id/grade', auth, requireRole('teacher', 'admin'), (req, res) => {
  const { grade, feedback } = req.body;
  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  const asgn = db.prepare('SELECT * FROM assignments WHERE id = ?').get(sub.assignment_id);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(asgn.class_id);
  if (req.user.role === 'teacher' && cls.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const numericGrade = asPositiveNumber(grade);
  if (!Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > asgn.points) {
    return res.status(400).json({ error: `Grade must be between 0 and ${asgn.points}.` });
  }
  db.prepare(`UPDATE submissions SET grade=?, feedback=?, status='graded' WHERE id=?`).run(numericGrade, feedback || '', req.params.id);
  const updated = mapSubmission(db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id));
  notify(sub.student_id, `Your submission for "${asgn.title}" was graded: ${numericGrade}/${asgn.points} pts`, '✅');
  res.json({ submission: updated });
});

// ─── Announcements ────────────────────────────────────────────────────────────
app.get('/api/materials/:id/download', auth, (req, res) => {
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Material not found' });
  const allowed = req.user.role === 'admin'
    || db.prepare('SELECT 1 FROM classes WHERE id = ? AND teacher_id = ?').get(material.class_id, req.user.id)
    || db.prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?').get(material.class_id, req.user.id);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  if (!material.file_path) return res.status(404).json({ error: 'No file uploaded for this material.' });
  const filePath = path.join(uploadsDir, path.basename(material.file_path));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File is missing on the server.' });
  res.download(filePath, material.file_name || material.title);
});

app.get('/api/submissions/:id/download', auth, (req, res) => {
  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  const asgn = db.prepare('SELECT * FROM assignments WHERE id = ?').get(sub.assignment_id);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(asgn.class_id);
  const allowed = req.user.role === 'admin' || sub.student_id === req.user.id || cls.teacher_id === req.user.id;
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  if (!sub.file_path) return res.status(404).json({ error: 'This submission does not include an uploaded file.' });
  const filePath = path.join(uploadsDir, path.basename(sub.file_path));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File is missing on the server.' });
  res.download(filePath, sub.file_name || 'submission');
});

app.post('/api/announcements', auth, requireRole('teacher', 'admin'), (req, res) => {
  requireFields(req.body, ['classId', 'title', 'body']);
  const classId = Number(req.body.classId);
  const title = cleanString(req.body.title, 180);
  const body = cleanString(req.body.body, 4000);
  const { pinned } = req.body;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (req.user.role === 'teacher' && cls.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const r = db.prepare(`INSERT INTO announcements (class_id, author_id, title, body, pinned) VALUES (?, ?, ?, ?, ?)`)
    .run(classId, req.user.id, title, body, pinned ? 1 : 0);
  const ann = mapAnnouncement(db.prepare('SELECT * FROM announcements WHERE id = ?').get(r.lastInsertRowid));
  const enrolled = db.prepare('SELECT user_id FROM enrollments WHERE class_id = ?').all(classId);
  for (const { user_id } of enrolled) {
    notify(user_id, `New announcement in ${cls.name}: ${title}`, '📢');
  }
  res.status(201).json({ announcement: ann });
});

// ─── Materials ────────────────────────────────────────────────────────────────
app.post('/api/classes/:classId/materials', auth, requireRole('teacher', 'admin'), upload.single('file'), (req, res) => {
  const classId = Number(req.params.classId);
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (req.user.role === 'teacher' && cls.teacher_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { title, type } = req.body;
  const fileName = req.file?.originalname;
  const filePath = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
  const sizeBytes = req.file?.size || 0;
  const icons = { pdf: '📄', zip: '📦', slides: '📊' };
  const r = db.prepare(`INSERT INTO materials (class_id, title, type, file_name, file_path, size_bytes, icon) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(classId, title || fileName || 'Untitled', type || 'pdf', fileName, filePath, sizeBytes, icons[type] || '📄');
  res.status(201).json({ material: mapMaterial(db.prepare('SELECT * FROM materials WHERE id = ?').get(r.lastInsertRowid)) });
});

// ─── Events ───────────────────────────────────────────────────────────────────
app.post('/api/events', auth, requireRole('teacher', 'admin'), (req, res) => {
  requireFields(req.body, ['title', 'date']);
  assertDate(req.body.date);
  const title = cleanString(req.body.title, 180);
  const { date, type, color, classId } = req.body;
  const r = db.prepare(`INSERT INTO events (title, date, type, color, class_id) VALUES (?, ?, ?, ?, ?)`)
    .run(title, date, type || 'event', color || '#10b981', classId || null);
  res.status(201).json({ event: db.prepare('SELECT * FROM events WHERE id = ?').get(r.lastInsertRowid) });
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.patch('/api/notifications/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.patch('/api/notifications/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ─── Admin settings & reports ─────────────────────────────────────────────────
app.get('/api/admin/reports', auth, requireRole('admin'), (_req, res) => {
  const totalStudents = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='student'`).get().c;
  const totalTeachers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='teacher'`).get().c;
  const assignmentCount = db.prepare('SELECT COUNT(*) as c FROM assignments').get().c;
  const submissionCount = db.prepare('SELECT COUNT(*) as c FROM submissions').get().c;
  const classEnrollment = db.prepare(`
    SELECT c.id, c.name, c.color, COUNT(e.user_id) as students
    FROM classes c LEFT JOIN enrollments e ON e.class_id = c.id
    GROUP BY c.id
  `).all();
  const typeDist = db.prepare(`SELECT type, COUNT(*) as count FROM assignments GROUP BY type`).all();
  res.json({ totalStudents, totalTeachers, assignmentCount, submissionCount, classEnrollment, typeDist });
});

app.get('/api/admin/settings', auth, requireRole('admin'), (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

app.patch('/api/admin/settings', auth, requireRole('admin'), (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [key, value] of Object.entries(req.body)) upsert.run(key, String(value));
  res.json({ ok: true });
});

app.post('/api/admin/reset', auth, requireRole('admin'), (_req, res) => {
  db.exec(`DELETE FROM notifications; DELETE FROM attendance_records; DELETE FROM attendance_sessions; DELETE FROM submissions; DELETE FROM materials; DELETE FROM announcements; DELETE FROM events; DELETE FROM assignments; DELETE FROM enrollments; DELETE FROM classes;`);
  res.json({ ok: true, message: 'Academic data cleared. Users preserved.' });
});

app.post('/api/admin/seed', auth, requireRole('admin'), async (_req, res) => {
  await import('./seed.js');
  res.json({ ok: true, message: 'Database re-seeded with demo data.' });
});

const clientDist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use('/api', notFound);
app.use(errorHandler);

app.listen(PORT, HOST, () => {
  logger.info(`SmartClass API listening on ${HOST}:${PORT}`);
  logger.info(`Local API: http://localhost:${PORT}`);
  const ips = getNetworkAddresses();
  if (ips.length) {
    console.log('  Network (share these URLs on your Wi‑Fi/LAN):');
    for (const ip of ips) logger.info(`http://${ip}:${PORT}`);
  }
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    logger.info('Web app + API are on the same port (production build).');
  } else {
    logger.info('Dev UI: run npm run dev and open the Network URL Vite prints (port 5173).');
  }
});

export default app;
