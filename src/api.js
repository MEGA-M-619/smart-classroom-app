import { apiUrl, appConfig } from './config.js';

const TOKEN_KEY = 'sca_token';

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), appConfig.apiTimeoutMs);
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(apiUrl(path), {
      ...options,
      headers,
      credentials: appConfig.apiBaseUrl ? 'omit' : 'same-origin',
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) setToken(null);
      throw new ApiError(data.error || res.statusText || 'Request failed', {
        status: res.status,
        details: data.details || null,
      });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. Please try again.', { status: 408 });
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to reach the SmartClass API. Check your network or API URL.', { status: 0 });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function download(path, fallbackName) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(apiUrl(path), { headers, credentials: appConfig.apiBaseUrl ? 'omit' : 'same-origin' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || res.statusText || 'Download failed', { status: res.status });
  }
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] || fallbackName || 'download';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  bootstrap: () => request('/bootstrap'),
  updateProfile: (body) => request('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  updatePassword: (currentPassword, newPassword) =>
    request('/users/me/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  createClass: (body) => request('/classes', { method: 'POST', body: JSON.stringify(body) }),
  joinClass: (code) => request('/classes/join', { method: 'POST', body: JSON.stringify({ code }) }),
  createAssignment: (body) => request('/assignments', { method: 'POST', body: JSON.stringify(body) }),
  submitAssignment: (assignmentId, file, fileName) => {
    const fd = new FormData();
    if (file) fd.append('file', file);
    else if (fileName) fd.append('fileName', fileName);
    return request(`/assignments/${assignmentId}/submit`, { method: 'POST', body: fd });
  },
  gradeSubmission: (id, grade, feedback, rubricScores) =>
    request(`/submissions/${id}/grade`, { method: 'PATCH', body: JSON.stringify({ grade, feedback, rubricScores }) }),
  downloadSubmission: (id, fileName) => download(`/submissions/${id}/download`, fileName),
  createAnnouncement: (body) => request('/announcements', { method: 'POST', body: JSON.stringify(body) }),
  uploadMaterial: (classId, title, type, file) => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('type', type || 'pdf');
    if (file) fd.append('file', file);
    return request(`/classes/${classId}/materials`, { method: 'POST', body: fd });
  },
  downloadMaterial: (id, fileName) => download(`/materials/${id}/download`, fileName),
  createEvent: (body) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  getReports: () => request('/admin/reports'),
  getSettings: () => request('/admin/settings'),
  updateSettings: (body) => request('/admin/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  resetData: () => request('/admin/reset', { method: 'POST' }),
  getClassAttendance: (classId, date) =>
    request(`/classes/${classId}/attendance${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  saveClassAttendance: (classId, date, records) =>
    request(`/classes/${classId}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ date, records }),
    }),
  completeOnboarding: () => request('/users/me/onboarding', { method: 'PATCH', body: JSON.stringify({ complete: true }) }),
  getClassInvite: (classId) => request(`/classes/${classId}/invite`),
  joinClassInvite: (token) => request(`/classes/join-invite/${token}`, { method: 'POST' }),
  getDiscussions: (classId) => request(`/discussions?classId=${classId}`),
  createDiscussion: (body) => request('/discussions', { method: 'POST', body: JSON.stringify(body) }),
  getDiscussionReplies: (id) => request(`/discussions/${id}/replies`),
  replyDiscussion: (id, body) => request(`/discussions/${id}/replies`, { method: 'POST', body: JSON.stringify({ body }) }),
  getMessages: () => request('/messages'),
  sendMessage: (body) => request('/messages', { method: 'POST', body: JSON.stringify(body) }),
  getLearningGoals: () => request('/learning-goals'),
  createLearningGoal: (body) => request('/learning-goals', { method: 'POST', body: JSON.stringify(body) }),
  updateLearningGoal: (id, body) => request(`/learning-goals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getGradebook: (classId) => request(`/gradebook?classId=${classId}`),
  exportGradebook: (classId) => download(`/export/gradebook.csv?classId=${classId}`, `gradebook-${classId}.csv`),
  getTeacherAnalytics: () => request('/analytics/teacher'),
  getStudentAnalytics: () => request('/analytics/student'),
  generateAI: (body) => request('/ai/generate', { method: 'POST', body: JSON.stringify(body) }),
  getAuditLogs: () => request('/admin/audit-logs'),
  gradebookExportUrl: (classId) => apiUrl(`/export/gradebook.csv?classId=${classId}`),
  getParentStudents: () => request('/parent/students'),
  getParentDashboard: (studentId) => request(`/parent/dashboard?studentId=${studentId}`),
  linkParentStudent: (studentEmail, relationship) =>
    request('/parent/link', { method: 'POST', body: JSON.stringify({ studentEmail, relationship }) }),
  registerParent: (body) => request('/parent/register', { method: 'POST', body: JSON.stringify(body) }),
  getNotificationPrefs: () => request('/users/me/notification-prefs'),
  updateNotificationPrefs: (prefs) =>
    request('/users/me/notification-prefs', { method: 'PATCH', body: JSON.stringify({ prefs }) }),
  getNotificationUpdates: (after) => request(`/notifications/updates?after=${after || 0}`),
  getAssignmentRubric: (assignmentId) => request(`/assignments/${assignmentId}/rubric`),
  saveAssignmentRubric: (assignmentId, criteria) =>
    request(`/assignments/${assignmentId}/rubric`, { method: 'PUT', body: JSON.stringify({ criteria }) }),
  updateEvent: (id, body) => request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  exportCalendar: () => download('/calendar/export.ics', 'smartclass-calendar.ics'),
  importCalendar: (events) => request('/calendar/import', { method: 'POST', body: JSON.stringify({ events }) }),
  getPredictions: (classId) => request(`/analytics/predictions${classId ? `?classId=${classId}` : ''}`),
  getSchoolPredictions: () => request('/analytics/predictions/school'),
  getStudentPrediction: () => request('/analytics/predictions/student'),
  getMessageThreads: () => request('/messages/threads'),
  getMessageThread: (peerId) => request(`/messages/thread/${peerId}`),
  searchMessages: (q) => request(`/messages/search?q=${encodeURIComponent(q)}`),
  createSchoolAnnouncement: (body) => request('/announcements/school', { method: 'POST', body: JSON.stringify(body) }),
};
