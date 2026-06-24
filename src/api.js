import axios from 'axios';

const TOKEN_KEY = 'smartclass_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status || 0;
    const message = error.response?.data?.message || error.message || 'Request failed.';
    throw new ApiError(message, { status, details: error.response?.data || null });
  },
);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function normalizeRole(role) {
  return String(role || 'student').toLowerCase();
}

function normalizeUser(user) {
  if (!user) return null;
  const name = user.name || user.fullName || user.full_name || user.email || 'SmartClass User';
  return {
    ...user,
    name,
    fullName: name,
    role: normalizeRole(user.role),
    avatar: user.avatar || name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2),
    darkMode: !!user.darkMode,
    emailNotifications: user.emailNotifications !== false,
  };
}

function normalizeClass(item) {
  return {
    ...item,
    title: item.title || item.name,
    joinCode: item.joinCode || item.code,
    teacherId: item.teacherId,
    students: item.students || 0,
  };
}

function normalizeBootstrap(data = {}) {
  return {
    classes: (data.classes || []).map(normalizeClass),
    assignments: data.assignments || [],
    announcements: data.announcements || [],
    materials: data.materials || [],
    events: data.events || [],
    notifications: data.notifications || [],
    submissions: data.submissions || [],
    users: (data.users || []).map(normalizeUser),
    classStudents: data.classStudents || {},
    settings: data.settings || {},
    attendanceSummary: data.attendanceSummary || [],
    attendanceRecent: data.attendanceRecent || [],
    stats: data.stats || {},
  };
}

async function uploadFile(file) {
  if (!file) return {};
  const form = new FormData();
  form.append('file', file);
  const response = await http.post('/files', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

async function login(email, password) {
  const response = await http.post('/auth/login', { email, password });
  setToken(response.data.token);
  return { token: response.data.token, user: normalizeUser(response.data.user) };
}

async function register(body) {
  const response = await http.post('/auth/register', {
    fullName: body.name || body.fullName,
    email: body.email,
    password: body.password,
    role: String(body.role || 'student').toUpperCase(),
  });
  setToken(response.data.token);
  return { token: response.data.token, user: normalizeUser(response.data.user) };
}

async function me() {
  if (!getToken()) throw new ApiError('Unauthorized', { status: 401 });
  const response = await http.get('/auth/me');
  return { user: normalizeUser(response.data.user) };
}

async function bootstrap() {
  const response = await http.get('/dashboard/bootstrap');
  return normalizeBootstrap(response.data);
}

async function updateProfile(body) {
  const current = await me();
  const response = await http.put(`/users/${current.user.id}`, {
    fullName: body.name ?? body.fullName,
    email: body.email,
    phone: body.phone,
    bio: body.bio,
    darkMode: body.darkMode,
    emailNotifications: body.emailNotifications,
  });
  return { user: normalizeUser(response.data.user) };
}

async function updatePassword(_currentPassword, newPassword) {
  const response = await http.put('/users/password', { newPassword });
  return response.data;
}

async function createClass(body) {
  const response = await http.post('/classes', body);
  return { class: normalizeClass(response.data.class) };
}

async function joinClass(code) {
  const response = await http.post('/classes/join', { code });
  return { class: normalizeClass(response.data.class) };
}

async function createAssignment(body) {
  const response = await http.post('/assignments', body);
  return { assignment: response.data.assignment };
}

async function submitAssignment(assignmentId, file, fileName, textAnswer = '') {
  const uploaded = await uploadFile(file);
  const response = await http.post('/submissions', {
    assignmentId,
    fileUrl: uploaded.fileUrl || null,
    fileName: uploaded.fileName || fileName || file?.name || '',
    textAnswer,
  });
  return { submission: response.data.submission };
}

async function gradeSubmission(id, grade, feedback) {
  const response = await http.put(`/submissions/${id}/grade`, { grade, feedback });
  return { submission: response.data.submission };
}

async function createAnnouncement(body) {
  const response = await http.post('/announcements', body);
  return { announcement: response.data.announcement };
}

async function uploadMaterial(classId, title, type, file) {
  const uploaded = await uploadFile(file);
  return {
    material: {
      id: `${Date.now()}`,
      classId,
      title: title || uploaded.fileName || 'Material',
      type: type || 'file',
      size: file?.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Uploaded file',
      date: new Date().toISOString().slice(0, 10),
      icon: 'FILE',
      fileName: uploaded.fileName,
      fileUrl: uploaded.fileUrl,
    },
  };
}

function openUrl(url) {
  if (!url) throw new ApiError('No uploaded file is attached.', { status: 404 });
  const absolute = url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url}`;
  window.open(absolute, '_blank', 'noopener,noreferrer');
  return { ok: true };
}

export const api = {
  logout: async () => {
    setToken(null);
    return { ok: true };
  },
  login,
  register,
  me,
  bootstrap,
  updateProfile,
  updatePassword,
  createUser: async (body) => {
    const response = await http.post('/users', {
      fullName: body.name || body.fullName,
      email: body.email,
      password: body.password,
      role: String(body.role || 'student').toUpperCase(),
    });
    return { user: normalizeUser(response.data.user) };
  },
  updateUser: async (id, body) => {
    const response = await http.put(`/users/${id}`, body);
    return { user: normalizeUser(response.data.user) };
  },
  deleteUser: async (id) => {
    const response = await http.delete(`/users/${id}`);
    return response.data;
  },
  createClass,
  joinClass,
  createAssignment,
  submitAssignment,
  gradeSubmission,
  downloadSubmission: async (_id, fileName) => openUrl(fileName),
  createAnnouncement,
  uploadMaterial,
  downloadMaterial: async (_id, fileName) => openUrl(fileName),
  createEvent: async (body) => ({ event: { id: `${Date.now()}`, ...body } }),
  markNotificationRead: async (id) => {
    const response = await http.put(`/notifications/${id}/read`);
    return response.data;
  },
  markAllNotificationsRead: async () => {
    const response = await http.put('/notifications/read-all');
    return response.data;
  },
  getReports: bootstrap,
  getSettings: async () => ({}),
  updateSettings: async () => ({ ok: true }),
  resetData: async () => ({ ok: true }),
  getClassAttendance: async () => ({ records: [], history: [], sessionDate: new Date().toISOString().slice(0, 10) }),
  saveClassAttendance: async (_classId, date, records) => ({ records, history: [], sessionDate: date }),
};
