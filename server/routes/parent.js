import bcrypt from 'bcryptjs';
import { db, userPublic } from '../db.js';
import { cleanString, requireFields, assertEmail, assertPassword } from '../validation.js';
import { predictStudentPerformance } from '../services/prediction.js';

function linkedStudents(parentId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, u.major, u.year, psl.relationship
    FROM parent_student_links psl
    JOIN users u ON u.id = psl.student_id
    WHERE psl.parent_id = ?
    ORDER BY u.name
  `).all(parentId);
}

function canViewStudent(parentId, studentId) {
  return !!db.prepare(
    'SELECT 1 FROM parent_student_links WHERE parent_id = ? AND student_id = ?',
  ).get(parentId, studentId);
}

function studentClassIds(studentId) {
  return db.prepare('SELECT class_id FROM enrollments WHERE user_id = ?').all(studentId).map((r) => r.class_id);
}

export function registerParentRoutes(app, { auth, requireRole }) {
  app.get('/api/parent/students', auth, requireRole('parent'), (req, res) => {
    res.json({ students: linkedStudents(req.user.id) });
  });

  app.post('/api/parent/link', auth, requireRole('parent', 'admin'), (req, res) => {
    requireFields(req.body, ['studentEmail']);
    const email = cleanString(req.body.studentEmail, 320).toLowerCase();
    const student = db.prepare('SELECT id, name FROM users WHERE email = ? AND role = ?').get(email, 'student');
    if (!student) return res.status(404).json({ error: 'Student account not found.' });
    const parentId = req.user.role === 'admin' && req.body.parentId
      ? Number(req.body.parentId)
      : req.user.id;
    const exists = db.prepare(
      'SELECT 1 FROM parent_student_links WHERE parent_id = ? AND student_id = ?',
    ).get(parentId, student.id);
    if (exists) return res.status(409).json({ error: 'Already linked to this student.' });
    db.prepare(
      'INSERT INTO parent_student_links (parent_id, student_id, relationship) VALUES (?, ?, ?)',
    ).run(parentId, student.id, cleanString(req.body.relationship || 'parent', 40));
    res.status(201).json({ student: { id: student.id, name: student.name, email } });
  });

  app.get('/api/parent/dashboard', auth, requireRole('parent'), (req, res) => {
    const studentId = Number(req.query.studentId);
    if (!studentId) {
      const students = linkedStudents(req.user.id);
      return res.json({ students, selected: null });
    }
    if (!canViewStudent(req.user.id, studentId)) {
      return res.status(403).json({ error: 'Not linked to this student.' });
    }
    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId);
    const classIds = studentClassIds(studentId);
    let assignments = [];
    let announcements = [];
    let grades = [];
    let attendance = [];
    let deadlines = [];

    if (classIds.length) {
      const ph = classIds.map(() => '?').join(',');
      assignments = db.prepare(`
        SELECT a.*, c.name as className, c.color,
          s.id as submissionId, s.status as submissionStatus, s.grade, s.feedback, s.submitted_at
        FROM assignments a
        JOIN classes c ON c.id = a.class_id
        LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE a.class_id IN (${ph})
        ORDER BY a.due_date
      `).all(studentId, ...classIds).map((row) => ({
        id: row.id,
        title: row.title,
        className: row.className,
        color: row.color,
        dueDate: row.due_date,
        points: row.points,
        status: row.submissionStatus || 'missing',
        grade: row.grade,
        feedback: row.feedback || '',
        submittedAt: row.submitted_at,
      }));

      announcements = db.prepare(`
        SELECT a.*, c.name as className, u.name as authorName
        FROM announcements a
        JOIN classes c ON c.id = a.class_id
        JOIN users u ON u.id = a.author_id
        WHERE a.class_id IN (${ph}) OR a.is_school_wide = 1
        ORDER BY a.created_at DESC LIMIT 20
      `).all(...classIds).map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        className: a.is_school_wide ? 'School-wide' : a.className,
        author: a.authorName,
        date: a.created_at?.slice(0, 10),
        pinned: !!a.pinned,
      }));

      grades = assignments.filter((a) => a.grade != null).map((a) => ({
        assignment: a.title,
        className: a.className,
        grade: a.grade,
        points: a.points,
        percent: Math.round((a.grade / a.points) * 100),
        feedback: a.feedback,
      }));

      attendance = db.prepare(`
        SELECT ar.status, s.session_date as date, c.name as className, c.color
        FROM attendance_records ar
        JOIN attendance_sessions s ON s.id = ar.session_id
        JOIN classes c ON c.id = s.class_id
        WHERE ar.student_id = ? AND s.class_id IN (${ph})
        ORDER BY s.session_date DESC LIMIT 30
      `).all(studentId, ...classIds);

      deadlines = assignments
        .filter((a) => a.status === 'missing' && a.dueDate >= new Date().toISOString().slice(0, 10))
        .slice(0, 8);
    }

    const prediction = predictStudentPerformance(studentId);
    const avgGrade = grades.length
      ? Math.round(grades.reduce((s, g) => s + g.percent, 0) / grades.length)
      : null;

    res.json({
      student: userPublic(student),
      assignments,
      announcements,
      grades,
      attendance,
      deadlines,
      prediction,
      stats: {
        avgGrade,
        missing: assignments.filter((a) => a.status === 'missing').length,
        submitted: assignments.filter((a) => a.status !== 'missing').length,
        attendanceRate: prediction?.indicators?.attendanceRate ?? null,
      },
    });
  });

  app.post('/api/parent/register', (req, res) => {
    requireFields(req.body, ['name', 'email', 'password', 'studentEmail']);
    const name = cleanString(req.body.name, 120);
    const email = cleanString(req.body.email, 320).toLowerCase();
    const password = String(req.body.password || '');
    const studentEmail = cleanString(req.body.studentEmail, 320).toLowerCase();
    assertEmail(email);
    assertEmail(studentEmail);
    assertPassword(password);
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'Email already registered.' });
    const student = db.prepare('SELECT id FROM users WHERE email = ? AND role = ?').get(studentEmail, 'student');
    if (!student) return res.status(404).json({ error: 'Student email not found. Ask your school to verify the address.' });
    const avatar = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const r = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, avatar)
      VALUES (?, ?, ?, 'parent', ?, ?)
    `).run(name, email, bcrypt.hashSync(password, 10), req.body.phone || null, avatar);
    db.prepare('INSERT INTO parent_student_links (parent_id, student_id) VALUES (?, ?)').run(r.lastInsertRowid, student.id);
    res.status(201).json({ ok: true, message: 'Parent account created. Please sign in.' });
  });
}
