import crypto from 'node:crypto';
import { db, userPublic } from '../db.js';
import { auditLog } from '../services/audit.js';
import { generateAIContent } from '../services/ai.js';
import { cleanString, requireFields } from '../validation.js';

function getTeacherName(id) {
  return db.prepare('SELECT name FROM users WHERE id = ?').get(id)?.name || 'Instructor';
}

function studentCount(classId) {
  return db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE class_id = ?').get(classId).c;
}

function canAccessClass(user, classId) {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return null;
  if (user.role === 'admin' || cls.teacher_id === user.id) return cls;
  const enrolled = db.prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?').get(classId, user.id);
  return enrolled ? cls : null;
}

function ensureInviteToken(classId) {
  const row = db.prepare('SELECT invite_token FROM classes WHERE id = ?').get(classId);
  if (row?.invite_token) return row.invite_token;
  const token = crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE classes SET invite_token = ? WHERE id = ?').run(token, classId);
  return token;
}

function buildAtRiskStudents(classIds) {
  if (!classIds.length) return [];
  const ph = classIds.map(() => '?').join(',');
  const students = db.prepare(`
    SELECT DISTINCT u.id, u.name, u.email, u.avatar, e.class_id as classId, c.name as className
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN classes c ON c.id = e.class_id
    WHERE e.class_id IN (${ph}) AND u.role = 'student'
  `).all(...classIds);

  return students.map((s) => {
    const absences = db.prepare(`
      SELECT COUNT(*) as c FROM attendance_records ar
      JOIN attendance_sessions sess ON sess.id = ar.session_id
      WHERE ar.student_id = ? AND sess.class_id = ? AND ar.status = 'absent'
    `).get(s.id, s.classId)?.c || 0;
    const missing = db.prepare(`
      SELECT COUNT(*) as c FROM assignments a
      LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
      WHERE a.class_id = ? AND sub.id IS NULL AND a.due_date < date('now')
    `).get(s.id, s.classId)?.c || 0;
    const riskScore = absences * 2 + missing * 3;
    return {
      studentId: s.id,
      name: s.name,
      email: s.email,
      avatar: s.avatar,
      classId: s.classId,
      className: s.className,
      absences,
      missingAssignments: missing,
      riskScore,
      level: riskScore >= 6 ? 'high' : riskScore >= 3 ? 'medium' : 'low',
    };
  }).filter((s) => s.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
}

export function registerPlatformRoutes(app, { auth, requireRole }) {
  app.patch('/api/users/me/onboarding', auth, (req, res) => {
    const complete = req.body.complete !== false ? 1 : 0;
    db.prepare('UPDATE users SET onboarding_complete = ? WHERE id = ?').run(complete, req.user.id);
    const user = userPublic(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id));
    res.json({ user });
  });

  app.get('/api/classes/:classId/invite', auth, requireRole('teacher', 'admin'), (req, res) => {
    const classId = Number(req.params.classId);
    const cls = canAccessClass(req.user, classId);
    if (!cls || (req.user.role === 'teacher' && cls.teacher_id !== req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const token = ensureInviteToken(classId);
    const base = process.env.PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    res.json({
      code: cls.code,
      inviteToken: token,
      inviteUrl: base ? `${base}/join/${token}` : null,
      joinPath: `/join/${token}`,
    });
  });

  app.post('/api/classes/join-invite/:token', auth, requireRole('student'), (req, res) => {
    const cls = db.prepare('SELECT * FROM classes WHERE invite_token = ?').get(req.params.token);
    if (!cls) return res.status(404).json({ error: 'Invalid invitation link.' });
    const exists = db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND class_id = ?').get(req.user.id, cls.id);
    if (exists) return res.status(409).json({ error: 'Already enrolled.' });
    db.prepare('INSERT INTO enrollments (user_id, class_id) VALUES (?, ?)').run(req.user.id, cls.id);
    auditLog(req, 'class.join_invite', 'class', cls.id);
    res.json({ class: { id: cls.id, name: cls.name, code: cls.code } });
  });

  app.get('/api/discussions', auth, (req, res) => {
    const classId = Number(req.query.classId);
    if (!classId) return res.status(400).json({ error: 'classId required' });
    if (!canAccessClass(req.user, classId)) return res.status(403).json({ error: 'Forbidden' });
    const threads = db.prepare(`
      SELECT t.*, u.name as authorName, u.avatar as authorAvatar,
        (SELECT COUNT(*) FROM discussion_replies r WHERE r.thread_id = t.id) as replyCount
      FROM discussion_threads t
      JOIN users u ON u.id = t.author_id
      WHERE t.class_id = ?
      ORDER BY t.pinned DESC, t.created_at DESC
    `).all(classId).map((t) => ({
      id: t.id,
      classId: t.class_id,
      title: t.title,
      body: t.body,
      pinned: !!t.pinned,
      authorName: t.authorName,
      authorAvatar: t.authorAvatar,
      replyCount: t.replyCount,
      createdAt: t.created_at,
    }));
    res.json({ threads });
  });

  app.post('/api/discussions', auth, (req, res) => {
    requireFields(req.body, ['classId', 'title', 'body']);
    const classId = Number(req.body.classId);
    const cls = canAccessClass(req.user, classId);
    if (!cls) return res.status(403).json({ error: 'Forbidden' });
    const r = db.prepare(`
      INSERT INTO discussion_threads (class_id, author_id, title, body, pinned)
      VALUES (?, ?, ?, ?, ?)
    `).run(classId, req.user.id, cleanString(req.body.title, 200), cleanString(req.body.body, 4000), req.body.pinned ? 1 : 0);
    auditLog(req, 'discussion.create', 'discussion', r.lastInsertRowid);
    res.status(201).json({ id: r.lastInsertRowid });
  });

  app.get('/api/discussions/:id/replies', auth, (req, res) => {
    const thread = db.prepare('SELECT * FROM discussion_threads WHERE id = ?').get(req.params.id);
    if (!thread || !canAccessClass(req.user, thread.class_id)) return res.status(404).json({ error: 'Not found' });
    const replies = db.prepare(`
      SELECT r.*, u.name as authorName, u.avatar as authorAvatar
      FROM discussion_replies r JOIN users u ON u.id = r.author_id
      WHERE r.thread_id = ? ORDER BY r.created_at
    `).all(thread.id).map((r) => ({
      id: r.id, body: r.body, authorName: r.authorName, authorAvatar: r.authorAvatar, createdAt: r.created_at,
    }));
    res.json({ replies });
  });

  app.post('/api/discussions/:id/replies', auth, (req, res) => {
    requireFields(req.body, ['body']);
    const thread = db.prepare('SELECT * FROM discussion_threads WHERE id = ?').get(req.params.id);
    if (!thread || !canAccessClass(req.user, thread.class_id)) return res.status(404).json({ error: 'Not found' });
    const r = db.prepare('INSERT INTO discussion_replies (thread_id, author_id, body) VALUES (?, ?, ?)')
      .run(thread.id, req.user.id, cleanString(req.body.body, 4000));
    res.status(201).json({ id: r.lastInsertRowid });
  });

  app.get('/api/messages', auth, (req, res) => {
    const rows = db.prepare(`
      SELECT m.*, s.name as senderName, r.name as recipientName
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.recipient_id
      WHERE m.sender_id = ? OR m.recipient_id = ?
      ORDER BY m.created_at DESC LIMIT 100
    `).all(req.user.id, req.user.id).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      senderName: m.senderName,
      recipientName: m.recipientName,
      body: m.body,
      read: !!m.read,
      createdAt: m.created_at,
      mine: m.sender_id === req.user.id,
    }));
    res.json({ messages: rows });
  });

  app.post('/api/messages', auth, (req, res) => {
    requireFields(req.body, ['recipientId', 'body']);
    const r = db.prepare('INSERT INTO messages (sender_id, recipient_id, class_id, body) VALUES (?, ?, ?, ?)')
      .run(req.user.id, Number(req.body.recipientId), req.body.classId || null, cleanString(req.body.body, 2000));
    res.status(201).json({ id: r.lastInsertRowid });
  });

  app.get('/api/learning-goals', auth, (req, res) => {
    const goals = db.prepare('SELECT * FROM learning_goals WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
      .map((g) => ({ id: g.id, title: g.title, targetDate: g.target_date, progress: g.progress, createdAt: g.created_at }));
    res.json({ goals });
  });

  app.post('/api/learning-goals', auth, requireRole('student'), (req, res) => {
    requireFields(req.body, ['title']);
    const r = db.prepare('INSERT INTO learning_goals (user_id, title, target_date, progress) VALUES (?, ?, ?, ?)')
      .run(req.user.id, cleanString(req.body.title, 160), req.body.targetDate || null, Number(req.body.progress) || 0);
    res.status(201).json({ id: r.lastInsertRowid });
  });

  app.patch('/api/learning-goals/:id', auth, requireRole('student'), (req, res) => {
    const g = db.prepare('SELECT * FROM learning_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE learning_goals SET title=?, target_date=?, progress=? WHERE id=?')
      .run(req.body.title ?? g.title, req.body.targetDate ?? g.target_date, req.body.progress ?? g.progress, g.id);
    res.json({ ok: true });
  });

  app.get('/api/gradebook', auth, requireRole('teacher', 'admin'), (req, res) => {
    const classId = Number(req.query.classId);
    if (!classId) return res.status(400).json({ error: 'classId required' });
    const cls = canAccessClass(req.user, classId);
    if (!cls || (req.user.role === 'teacher' && cls.teacher_id !== req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const assignments = db.prepare('SELECT id, title, points, due_date FROM assignments WHERE class_id = ?').all(classId);
    const students = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar FROM users u
      JOIN enrollments e ON e.user_id = u.id WHERE e.class_id = ?
    `).all(classId);
    const rows = students.map((s) => {
      const grades = assignments.map((a) => {
        const sub = db.prepare('SELECT grade, status FROM submissions WHERE assignment_id = ? AND student_id = ?').get(a.id, s.id);
        return { assignmentId: a.id, grade: sub?.grade ?? null, status: sub?.status || 'missing' };
      });
      const scored = grades.filter((g) => g.grade != null);
      const avg = scored.length ? scored.reduce((sum, g) => sum + g.grade, 0) / scored.length : null;
      return { studentId: s.id, name: s.name, email: s.email, avatar: s.avatar, grades, average: avg };
    });
    res.json({ classId, assignments, rows });
  });

  app.get('/api/analytics/teacher', auth, requireRole('teacher', 'admin'), (req, res) => {
    const classIds = req.user.role === 'admin'
      ? db.prepare('SELECT id FROM classes').all().map((c) => c.id)
      : db.prepare('SELECT id FROM classes WHERE teacher_id = ?').all(req.user.id).map((c) => c.id);

    const completionRates = classIds.map((cid) => {
      const cls = db.prepare('SELECT name FROM classes WHERE id = ?').get(cid);
      const total = db.prepare('SELECT COUNT(*) as c FROM assignments WHERE class_id = ?').get(cid).c;
      const submitted = db.prepare(`
        SELECT COUNT(DISTINCT s.id) as c FROM submissions s
        JOIN assignments a ON a.id = s.assignment_id WHERE a.class_id = ?
      `).get(cid).c;
      const enrolled = studentCount(cid);
      const expected = total * enrolled || 1;
      return { classId: cid, className: cls?.name, rate: Math.round((submitted / expected) * 100) };
    });

    const weeklySubmissions = classIds.length ? db.prepare(`
      SELECT date(submitted_at) as day, COUNT(*) as count
      FROM submissions s
      JOIN assignments a ON a.id = s.assignment_id
      WHERE a.class_id IN (${classIds.map(() => '?').join(',')})
      AND submitted_at >= date('now', '-14 days')
      GROUP BY date(submitted_at) ORDER BY day
    `).all(...classIds) : [];

    res.json({
      completionRates,
      weeklySubmissions,
      atRisk: buildAtRiskStudents(classIds),
    });
  });

  app.get('/api/analytics/student', auth, requireRole('student'), (req, res) => {
    const classIds = db.prepare('SELECT class_id FROM enrollments WHERE user_id = ?').all(req.user.id).map((r) => r.class_id);
    const upcoming = classIds.length ? db.prepare(`
      SELECT a.title, a.due_date, c.name as className FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.class_id IN (${classIds.map(() => '?').join(',')})
      AND a.due_date >= date('now') ORDER BY a.due_date LIMIT 8
    `).all(...classIds) : [];
    const recommendations = [
      upcoming.length ? `Focus on "${upcoming[0].title}" due soon.` : 'You are caught up — review materials to stay ahead.',
      'Block 25 minutes daily for spaced repetition.',
      'Join class discussions to reinforce concepts.',
    ];
    res.json({ upcoming, recommendations });
  });

  app.post('/api/ai/generate', auth, (req, res) => {
    requireFields(req.body, ['type']);
    const result = generateAIContent(req.body.type, req.body);
    auditLog(req, 'ai.generate', 'ai', null, { type: req.body.type });
    res.json(result);
  });

  app.get('/api/export/gradebook.csv', auth, requireRole('teacher', 'admin'), (req, res) => {
    const classId = Number(req.query.classId);
    if (!classId) return res.status(400).json({ error: 'classId required' });
    const cls = canAccessClass(req.user, classId);
    if (!cls || (req.user.role === 'teacher' && cls.teacher_id !== req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const assignments = db.prepare('SELECT id, title FROM assignments WHERE class_id = ?').all(classId);
    const students = db.prepare(`
      SELECT u.id, u.name FROM users u JOIN enrollments e ON e.user_id = u.id WHERE e.class_id = ?
    `).all(classId);
    const header = ['Student', ...assignments.map((a) => a.title), 'Average'].join(',');
    const lines = students.map((s) => {
      const grades = assignments.map((a) => {
        const sub = db.prepare('SELECT grade FROM submissions WHERE assignment_id = ? AND student_id = ?').get(a.id, s.id);
        return sub?.grade ?? '';
      });
      const nums = grades.filter((g) => g !== '');
      const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : '';
      return [s.name, ...grades, avg].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gradebook-${classId}.csv"`);
    res.send([header, ...lines].join('\n'));
  });

  app.get('/api/admin/audit-logs', auth, requireRole('admin'), (_req, res) => {
    const logs = db.prepare(`
      SELECT a.*, u.name as userName FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC LIMIT 200
    `).all().map((l) => ({
      id: l.id, userName: l.userName, action: l.action, resourceType: l.resource_type,
      resourceId: l.resource_id, createdAt: l.created_at,
    }));
    res.json({ logs });
  });
}
