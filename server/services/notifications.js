import { db } from '../db.js';

/** @type {Map<number, Set<import('http').ServerResponse>>} */
const sseClients = new Map();

export const NOTIFICATION_TYPES = {
  ASSIGNMENT: 'assignment',
  GRADED: 'graded',
  FEEDBACK: 'feedback',
  ATTENDANCE: 'attendance',
  DISCUSSION: 'discussion',
  ANNOUNCEMENT: 'announcement',
  STUDY_PLAN: 'study_plan',
  DEADLINE: 'deadline',
  MESSAGE: 'message',
  GENERAL: 'general',
};

const TYPE_ICONS = {
  assignment: '📝',
  graded: '✅',
  feedback: '💬',
  attendance: '📋',
  discussion: '💬',
  announcement: '📢',
  study_plan: '✨',
  deadline: '⏰',
  message: '✉️',
  general: '🔔',
};

function prefsForUser(userId) {
  const row = db.prepare('SELECT notification_prefs_json FROM users WHERE id = ?').get(userId);
  try {
    return { ...defaultPrefs(), ...JSON.parse(row?.notification_prefs_json || '{}') };
  } catch {
    return defaultPrefs();
  }
}

export function defaultPrefs() {
  return {
    assignment: true,
    graded: true,
    feedback: true,
    attendance: true,
    discussion: true,
    announcement: true,
    study_plan: true,
    deadline: true,
    message: true,
  };
}

export function notifyUser(userId, text, { type = 'general', icon, link = null } = {}) {
  const prefs = prefsForUser(userId);
  if (prefs[type] === false) return null;
  const resolvedIcon = icon || TYPE_ICONS[type] || '🔔';
  const r = db.prepare(
    'INSERT INTO notifications (user_id, text, icon, type, link) VALUES (?, ?, ?, ?, ?)',
  ).run(userId, text, resolvedIcon, type, link);
  const payload = {
    id: r.lastInsertRowid,
    userId,
    text,
    icon: resolvedIcon,
    type,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  pushToUser(userId, payload);
  return payload;
}

function pushToUser(userId, payload) {
  const clients = sseClients.get(userId);
  if (!clients?.size) return;
  const data = `data: ${JSON.stringify({ event: 'notification', data: payload })}\n\n`;
  for (const res of clients) {
    try {
      res.write(data);
    } catch {
      clients.delete(res);
    }
  }
}

export function registerSseClient(userId, res) {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
  res.on('close', () => {
    sseClients.get(userId)?.delete(res);
  });
}

export function getNotificationsSince(userId, afterId = 0) {
  return db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ? AND id > ?
    ORDER BY id ASC
    LIMIT 50
  `).all(userId, afterId).map(mapNotification);
}

export function mapNotification(n) {
  return {
    id: n.id,
    text: n.text,
    icon: n.icon,
    type: n.type || 'general',
    link: n.link,
    read: !!n.read,
    createdAt: n.created_at,
  };
}

export function notifyParentsOfStudent(studentId, text, opts = {}) {
  const parents = db.prepare('SELECT parent_id FROM parent_student_links WHERE student_id = ?').all(studentId);
  for (const { parent_id } of parents) {
    notifyUser(parent_id, text, opts);
  }
}
