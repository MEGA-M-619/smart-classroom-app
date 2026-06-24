import { db } from '../db.js';

export function auditLog(req, action, resourceType = null, resourceId = null, meta = null) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, meta_json, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.user?.id || null,
      action,
      resourceType,
      resourceId,
      meta ? JSON.stringify(meta) : null,
      req.ip || req.headers['x-forwarded-for'] || null,
    );
  } catch {
    // Non-blocking audit trail
  }
}
