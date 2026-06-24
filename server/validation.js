const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanString(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

export function requireFields(body, fields) {
  if (!body || typeof body !== 'object') {
    const error = new Error('Request body is required.');
    error.status = 400;
    throw error;
  }
  const missing = fields.filter((field) => !cleanString(body[field]));
  if (missing.length) {
    const error = new Error(`Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

export function assertEmail(email) {
  if (!emailPattern.test(cleanString(email, 320))) {
    const error = new Error('A valid email address is required.');
    error.status = 400;
    throw error;
  }
}

export function assertPassword(password, min = 8) {
  if (String(password || '').length < min) {
    const error = new Error(`Password must be at least ${min} characters.`);
    error.status = 400;
    throw error;
  }
}

export function assertRole(role, allowed = ['student', 'teacher', 'parent']) {
  if (!allowed.includes(role)) {
    const error = new Error('Invalid role.');
    error.status = 400;
    throw error;
  }
}

export function assertDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    const error = new Error('Date must use YYYY-MM-DD format.');
    error.status = 400;
    throw error;
  }
}

export function asPositiveNumber(value, fallback = 0) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n) || n < 0) {
    const error = new Error('Numeric value must be zero or greater.');
    error.status = 400;
    throw error;
  }
  return n;
}
