import { db } from '../db.js';
import { cleanString, requireFields, assertDate } from '../validation.js';
import {
  defaultPrefs,
  getNotificationsSince,
  mapNotification,
  notifyUser,
  notifyParentsOfStudent,
  registerSseClient,
} from '../services/notifications.js';
import { predictClassRoster, predictSchoolWide, predictStudentPerformance } from '../services/prediction.js';
import { auditLog } from '../services/audit.js';

function threadIdFor(a, b) {
  return [Math.min(a, b), Math.max(a, b)].join(':');
}

function canAccessClass(user, classId) {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) return null;
  if (user.role === 'admin' || cls.teacher_id === user.id) return cls;
  const enrolled = db.prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?').get(classId, user.id);
  return enrolled ? cls : null;
}

export function registerModuleRoutes(app, { auth, requireRole }) {
  app.get('/api/notifications/stream', auth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    registerSseClient(req.user.id, res);
    res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);
    const keepAlive = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch { clearInterval(keepAlive); }
    }, 25000);
    req.on('close', () => clearInterval(keepAlive));
  });

  app.get('/api/notifications/updates', auth, (req, res) => {
    const afterId = Number(req.query.after || 0);
    const items = getNotificationsSince(req.user.id, afterId);
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).c;
    res.json({ notifications: items, unread });
  });

  app.get('/api/users/me/notification-prefs', auth, (req, res) => {
    const row = db.prepare('SELECT notification_prefs_json FROM users WHERE id = ?').get(req.user.id);
    try {
      res.json({ prefs: { ...defaultPrefs(), ...JSON.parse(row?.notification_prefs_json || '{}') } });
    } catch {
      res.json({ prefs: defaultPrefs() });
    }
  });

  app.patch('/api/users/me/notification-prefs', auth, (req, res) => {
    const prefs = { ...defaultPrefs(), ...(req.body.prefs || req.body) };
    db.prepare('UPDATE users SET notification_prefs_json = ? WHERE id = ?').run(JSON.stringify(prefs), req.user.id);
    res.json({ prefs });
  });

  app.get('/api/assignments/:id/rubric', auth, (req, res) => {
    const rubric = db.prepare('SELECT * FROM rubrics WHERE assignment_id = ?').get(req.params.id);
    res.json({
      rubric: rubric ? { id: rubric.id, criteria: JSON.parse(rubric.criteria_json) } : null,
    });
  });

  app.put('/api/assignments/:id/rubric', auth, requireRole('teacher', 'admin'), (req, res) => {
    const assignmentId = Number(req.params.id);
    const criteria = req.body.criteria;
    if (!Array.isArray(criteria) || !criteria.length) {
      return res.status(400).json({ error: 'criteria array is required.' });
    }
    const existing = db.prepare('SELECT id FROM rubrics WHERE assignment_id = ?').get(assignmentId);
    const json = JSON.stringify(criteria.map((c) => ({
      name: cleanString(c.name, 80),
      description: cleanString(c.description, 300),
      maxPoints: Number(c.maxPoints) || 0,
    })));
    if (existing) {
      db.prepare('UPDATE rubrics SET criteria_json = ? WHERE assignment_id = ?').run(json, assignmentId);
    } else {
      db.prepare('INSERT INTO rubrics (assignment_id, criteria_json) VALUES (?, ?)').run(assignmentId, json);
    }
    auditLog(req.user.id, 'rubric.update', 'assignment', assignmentId, {}, req.ip);
    res.json({ ok: true });
  });

  app.patch('/api/events/:id', auth, requireRole('teacher', 'admin'), (req, res) => {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const { date, title, type, color, description } = req.body;
    if (date) assertDate(date);
    db.prepare(`
      UPDATE events SET
        date = COALESCE(?, date),
        title = COALESCE(?, title),
        type = COALESCE(?, type),
        color = COALESCE(?, color),
        description = COALESCE(?, description)
      WHERE id = ?
    `).run(date || null, title ? cleanString(title, 180) : null, type || null, color || null,
      description != null ? cleanString(description, 500) : null, req.params.id);
    res.json({ event: db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) });
  });

  app.get('/api/calendar/export.ics', auth, (req, res) => {
    const events = db.prepare('SELECT * FROM events ORDER BY date').all();
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SmartClass//EN'];
    for (const e of events) {
      const dt = e.date.replace(/-/g, '');
      lines.push('BEGIN:VEVENT', `UID:sca-${e.id}@smartclass`, `DTSTART;VALUE=DATE:${dt}`, `SUMMARY:${e.title}`, `DESCRIPTION:${e.description || e.type}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="smartclass-calendar.ics"');
    res.send(lines.join('\r\n'));
  });

  app.post('/api/calendar/import', auth, requireRole('teacher', 'admin'), (req, res) => {
    const { events } = req.body;
    if (!Array.isArray(events)) return res.status(400).json({ error: 'events array required' });
    const ins = db.prepare('INSERT INTO events (title, date, type, color, class_id, description) VALUES (?, ?, ?, ?, ?, ?)');
    let count = 0;
    for (const ev of events) {
      if (!ev.title || !ev.date) continue;
      assertDate(ev.date);
      ins.run(cleanString(ev.title, 180), ev.date, ev.type || 'event', ev.color || '#6366f1', ev.classId || null, cleanString(ev.description || '', 500));
      count += 1;
    }
    res.json({ imported: count });
  });

  app.get('/api/analytics/predictions', auth, requireRole('teacher', 'admin'), (req, res) => {
    const classId = Number(req.query.classId);
    if (classId) {
      const cls = canAccessClass(req.user, classId);
      if (!cls && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      return res.json({ predictions: predictClassRoster(classId) });
    }
    const classIds = req.user.role === 'admin'
      ? db.prepare('SELECT id FROM classes').all().map((c) => c.id)
      : db.prepare('SELECT id FROM classes WHERE teacher_id = ?').all(req.user.id).map((c) => c.id);
    const predictions = classIds.flatMap((id) => predictClassRoster(id));
    const seen = new Set();
    const unique = predictions.filter((p) => {
      const key = `${p.studentId}-${p.classId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.riskScore - a.riskScore);
    res.json({ predictions: unique });
  });

  app.get('/api/analytics/predictions/school', auth, requireRole('admin'), (_req, res) => {
    res.json(predictSchoolWide());
  });

  app.get('/api/analytics/predictions/student', auth, requireRole('student'), (req, res) => {
    res.json({ prediction: predictStudentPerformance(req.user.id) });
  });

  app.get('/api/analytics/parent-engagement', auth, requireRole('admin'), (_req, res) => {
    const parents = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'parent'`).get().c;
    const links = db.prepare('SELECT COUNT(*) as c FROM parent_student_links').get().c;
    const active = db.prepare(`
      SELECT COUNT(DISTINCT parent_id) as c FROM parent_student_links
    `).get().c;
    res.json({ totalParents: parents, totalLinks: links, activeParents: active });
  });

  app.get('/api/messages/threads', auth, (req, res) => {
    const uid = req.user.id;
    const rows = db.prepare(`
      SELECT
        CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as peerId,
        MAX(created_at) as lastAt,
        SUM(CASE WHEN recipient_id = ? AND read = 0 THEN 1 ELSE 0 END) as unread
      FROM messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY peerId
      ORDER BY lastAt DESC
    `).all(uid, uid, uid, uid);
    const threads = rows.map((r) => {
      const peer = db.prepare('SELECT id, name, avatar, role FROM users WHERE id = ?').get(r.peerId);
      const last = db.prepare(`
        SELECT body FROM messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY created_at DESC LIMIT 1
      `).get(uid, r.peerId, r.peerId, uid);
      return {
        peerId: r.peerId,
        peerName: peer?.name,
        peerRole: peer?.role,
        avatar: peer?.avatar,
        lastMessage: last?.body,
        lastAt: r.lastAt,
        unread: r.unread,
      };
    });
    res.json({ threads });
  });

  app.get('/api/messages/thread/:peerId', auth, (req, res) => {
    const peerId = Number(req.params.peerId);
    const uid = req.user.id;
    const msgs = db.prepare(`
      SELECT m.*, u.name as senderName, u.avatar
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
      ORDER BY m.created_at ASC
    `).all(uid, peerId, peerId, uid).map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.sender_id,
      senderName: m.senderName,
      avatar: m.avatar,
      read: !!m.read,
      readAt: m.read_at,
      createdAt: m.created_at,
      mine: m.sender_id === uid,
    }));
    db.prepare(`
      UPDATE messages SET read = 1, read_at = datetime('now')
      WHERE recipient_id = ? AND sender_id = ? AND read = 0
    `).run(uid, peerId);
    res.json({ messages: msgs });
  });

  app.get('/api/messages/search', auth, (req, res) => {
    const q = cleanString(req.query.q, 80);
    if (!q) return res.json({ results: [] });
    const uid = req.user.id;
    const results = db.prepare(`
      SELECT m.*, u.name as senderName
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = ? OR m.recipient_id = ?) AND m.body LIKE ?
      ORDER BY m.created_at DESC LIMIT 30
    `).all(uid, uid, `%${q}%`).map((m) => ({
      id: m.id,
      body: m.body,
      senderName: m.senderName,
      createdAt: m.created_at,
      peerId: m.sender_id === uid ? m.recipient_id : m.sender_id,
    }));
    res.json({ results });
  });

  app.post('/api/announcements/school', auth, requireRole('admin', 'teacher'), (req, res) => {
    requireFields(req.body, ['title', 'body']);
    const classId = req.body.classId ? Number(req.body.classId) : null;
    const isSchoolWide = !classId || req.body.schoolWide;
    const r = db.prepare(`
      INSERT INTO announcements (class_id, author_id, title, body, pinned, scheduled_at, is_school_wide)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      classId || db.prepare('SELECT id FROM classes LIMIT 1').get()?.id || 1,
      req.user.id,
      cleanString(req.body.title, 180),
      cleanString(req.body.body, 5000),
      req.body.pinned ? 1 : 0,
      req.body.scheduledAt || null,
      isSchoolWide ? 1 : 0,
    );
    const users = isSchoolWide
      ? db.prepare('SELECT id FROM users').all()
      : db.prepare('SELECT user_id as id FROM enrollments WHERE class_id = ?').all(classId);
    for (const { id } of users) {
      notifyUser(id, `Announcement: ${req.body.title}`, { type: 'announcement' });
    }
    res.status(201).json({ id: r.lastInsertRowid });
  });
}

export { notifyUser, notifyParentsOfStudent };
