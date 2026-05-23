import { supabase } from './lib/supabase.js';

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export function getToken() {
  return Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
}

export function setToken() {
  // Supabase owns token persistence.
}

function fail(error, fallback = 'Supabase request failed.') {
  if (!error) return;
  throw new ApiError(error.message || fallback, {
    status: error.status || error.code || 0,
    details: error.details || null,
  });
}

async function currentSession() {
  const { data, error } = await supabase.auth.getSession();
  fail(error, 'Could not read the current session.');
  return data.session;
}

async function currentUser() {
  const session = await currentSession();
  if (!session?.user) throw new ApiError('Unauthorized', { status: 401 });
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  fail(error, 'Could not load your profile.');
  if (!data) throw new ApiError('User profile not found.', { status: 404 });
  return mapUser(data);
}

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso) {
  if (!iso) return 'Just now';
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'student',
    avatar: row.avatar || initials(row.name),
    department: row.department,
    major: row.major,
    year: row.year,
    phone: row.phone,
    bio: row.bio,
    darkMode: !!row.dark_mode,
    emailNotifications: row.email_notifications !== false,
    createdAt: row.created_at,
  };
}

function mapClass(row, users = [], enrollments = []) {
  const teacher = users.find((u) => u.id === row.teacher_id);
  return {
    id: row.id,
    name: row.title || row.name,
    title: row.title || row.name,
    code: row.code,
    teacherId: row.teacher_id,
    teacher: teacher?.name || 'Teacher',
    color: row.color || colors[Math.abs(String(row.id).charCodeAt(0) || 0) % colors.length],
    icon: row.icon || '📚',
    students: enrollments.filter((e) => e.class_id === row.id).length,
    semester: row.semester,
    description: row.description,
    schedule: row.schedule,
    room: row.room,
    maxStudents: row.max_students || 50,
  };
}

function mapAssignment(row, submissions = []) {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description || '',
    dueDate: row.due_date,
    points: row.points || 100,
    status: row.status || 'active',
    submissions: submissions.filter((s) => s.assignment_id === row.id).length,
    type: row.type || 'Assignment',
  };
}

function mapSubmission(row, users = []) {
  const student = users.find((u) => u.id === row.student_id);
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: student?.name || 'Student',
    avatar: student?.avatar || initials(student?.name),
    submittedAt: row.submitted_at,
    file: row.file_name,
    filePath: row.file_path,
    grade: row.grade,
    feedback: row.feedback,
    status: row.status || 'submitted',
  };
}

function mapAnnouncement(row, users = [], classes = []) {
  const author = users.find((u) => u.id === row.author_id);
  const cls = classes.find((c) => c.id === row.class_id);
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    body: row.body,
    teacher: author?.name || 'Teacher',
    avatar: author?.avatar || initials(author?.name),
    date: row.created_at?.slice(0, 10),
    pinned: !!row.pinned,
    color: cls?.color || '#6366f1',
  };
}

function mapMaterial(row) {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    type: row.type || 'pdf',
    size: formatSize(row.size_bytes || 0),
    date: row.uploaded_at?.slice(0, 10),
    icon: row.icon || '📄',
    filePath: row.file_path,
    fileName: row.file_name,
  };
}

async function getTable(name, select = '*') {
  const { data, error } = await supabase.from(name).select(select);
  fail(error, `Could not load ${name}.`);
  return data || [];
}

async function classIdsFor(user, classes, enrollments) {
  if (user.role === 'admin') return classes.map((c) => c.id);
  if (user.role === 'teacher') return classes.filter((c) => c.teacher_id === user.id).map((c) => c.id);
  return enrollments.filter((e) => e.user_id === user.id).map((e) => e.class_id);
}

async function notify(userId, text, icon = '🔔') {
  if (!userId) return;
  await supabase.from('notifications').insert({ user_id: userId, text, icon });
}

function pointsToGpa(percent) {
  if (percent >= 93) return 4;
  if (percent >= 90) return 3.7;
  if (percent >= 87) return 3.3;
  if (percent >= 83) return 3;
  if (percent >= 80) return 2.7;
  if (percent >= 77) return 2.3;
  if (percent >= 73) return 2;
  if (percent >= 70) return 1.7;
  if (percent >= 67) return 1.3;
  if (percent >= 63) return 1;
  if (percent >= 60) return 0.7;
  return 0;
}

async function bootstrap() {
  const user = await currentUser();
  const [allUsersRaw, allClassesRaw, enrollments, allAssignmentsRaw, allSubmissionsRaw, announcementsRaw, materialsRaw, eventsRaw, notificationsRaw, attendanceRaw, settingsRows] = await Promise.all([
    getTable('users'),
    getTable('classes'),
    getTable('class_enrollments'),
    getTable('assignments'),
    getTable('submissions'),
    getTable('announcements'),
    getTable('materials'),
    getTable('events'),
    getTable('notifications'),
    getTable('attendance'),
    getTable('settings'),
  ]);

  const allUsers = allUsersRaw.map(mapUser);
  const ids = await classIdsFor(user, allClassesRaw, enrollments);
  const visibleClassRows = user.role === 'admin' ? allClassesRaw : allClassesRaw.filter((c) => ids.includes(c.id));
  const classes = visibleClassRows.map((c) => mapClass(c, allUsers, enrollments));
  const visibleAssignmentsRaw = allAssignmentsRaw.filter((a) => ids.includes(a.class_id) || user.role === 'admin');
  let assignments = visibleAssignmentsRaw.map((a) => mapAssignment(a, allSubmissionsRaw));
  const submissions = (user.role === 'teacher'
    ? allSubmissionsRaw.filter((s) => visibleAssignmentsRaw.some((a) => a.id === s.assignment_id))
    : user.role === 'student'
      ? allSubmissionsRaw.filter((s) => s.student_id === user.id)
      : allSubmissionsRaw
  ).map((s) => mapSubmission(s, allUsers));

  if (user.role === 'student') {
    const mine = new Map(submissions.map((s) => [s.assignmentId, s]));
    assignments = assignments.map((a) => {
      const submission = mine.get(a.id);
      return {
        ...a,
        submitted: !!submission,
        submissionStatus: submission?.status || null,
        submissionGrade: submission?.grade ?? null,
        submissionFeedback: submission?.feedback || '',
        submittedAt: submission?.submittedAt || null,
      };
    });
  }

  const announcements = announcementsRaw
    .filter((a) => ids.includes(a.class_id) || user.role === 'admin')
    .map((a) => mapAnnouncement(a, allUsers, allClassesRaw));
  const materials = materialsRaw.filter((m) => ids.includes(m.class_id) || user.role === 'admin').map(mapMaterial);
  const events = eventsRaw
    .filter((e) => !e.class_id || ids.includes(e.class_id) || user.role === 'admin')
    .map((e) => ({ id: e.id, title: e.title, date: e.date, type: e.type, color: e.color }));
  const notifications = notificationsRaw
    .filter((n) => n.user_id === user.id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 50)
    .map((n) => ({ id: n.id, text: n.text, time: timeAgo(n.created_at), read: !!n.read, icon: n.icon }));
  const users = user.role === 'admin' ? allUsers : [];
  const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));

  const attendanceSummary = buildAttendanceSummary(user, classes, attendanceRaw);
  const attendanceRecent = user.role === 'student'
    ? attendanceRaw
      .filter((r) => r.student_id === user.id)
      .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        status: r.status,
        note: r.note || '',
        date: r.session_date,
        classId: r.class_id,
        className: classes.find((c) => c.id === r.class_id)?.name || 'Class',
      }))
    : [];
  const graded = submissions.filter((s) => s.status === 'graded' && s.grade != null);
  const gpa = graded.length
    ? graded.reduce((sum, s) => {
      const a = assignments.find((item) => item.id === s.assignmentId);
      return sum + pointsToGpa((Number(s.grade) / Number(a?.points || 100)) * 100);
    }, 0) / graded.length
    : null;

  return {
    classes,
    assignments,
    announcements,
    materials,
    events,
    notifications,
    submissions,
    users,
    settings,
    attendanceSummary,
    attendanceRecent,
    stats: {
      enrolledClasses: user.role === 'student' ? classes.length : undefined,
      pendingTasks: user.role === 'student' ? assignments.filter((a) => a.status === 'active' && !a.submitted).length : undefined,
      submittedCount: user.role === 'student' ? submissions.length : undefined,
      gradedCount: user.role === 'student' ? graded.length : undefined,
      gpa: gpa == null ? null : Number(gpa.toFixed(2)),
      attendancePercentage: user.role === 'student' && attendanceSummary.length
        ? Math.round(attendanceSummary.reduce((sum, row) => sum + (row.percentage || 0), 0) / attendanceSummary.length)
        : undefined,
      pendingGrades: user.role === 'teacher' ? submissions.filter((s) => s.status === 'submitted').length : undefined,
      totalStudents: user.role === 'teacher' ? classes.reduce((sum, c) => sum + c.students, 0) : undefined,
    },
  };
}

function buildAttendanceSummary(user, classes, attendanceRows) {
  if (user.role === 'student') {
    return classes.map((c) => {
      const rows = attendanceRows.filter((r) => r.student_id === user.id && r.class_id === c.id);
      const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
      return {
        classId: c.id,
        className: c.name,
        code: c.code,
        color: c.color,
        icon: c.icon,
        totalSessions: rows.length,
        presentCount: present,
        absentCount: rows.filter((r) => r.status === 'absent').length,
        lateCount: rows.filter((r) => r.status === 'late').length,
        percentage: rows.length ? Math.round((present / rows.length) * 100) : null,
      };
    }).filter((row) => row.totalSessions);
  }
  if (user.role === 'teacher') {
    return classes.map((c) => {
      const rows = attendanceRows.filter((r) => r.class_id === c.id);
      return {
        classId: c.id,
        className: c.name,
        code: c.code,
        color: c.color,
        icon: c.icon,
        totalSessions: new Set(rows.map((r) => r.session_date)).size,
        totalRecords: rows.length,
        absentCount: rows.filter((r) => r.status === 'absent').length,
      };
    });
  }
  return [];
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  fail(error, 'Invalid email or password.');
  const user = await currentUser();
  return { token: data.session?.access_token, user };
}

async function register(body) {
  const email = String(body.email || '').toLowerCase().trim();
  const name = String(body.name || '').trim();
  const role = body.role || 'student';
  const { data, error } = await supabase.auth.signUp({
    email,
    password: body.password,
    options: { data: { name, role } },
  });
  fail(error, 'Could not create your account.');
  if (!data.user) throw new ApiError('Could not create your account.', { status: 400 });
  const { error: profileError } = await supabase.from('users').upsert({
    id: data.user.id,
    name,
    email,
    role,
    phone: body.phone || null,
    department: body.department || null,
    major: body.major || null,
    year: body.year || null,
    bio: body.bio || null,
    avatar: initials(name),
  });
  fail(profileError, 'Could not create your profile.');
  return { token: data.session?.access_token, user: await currentUser() };
}

async function updateProfile(body) {
  const user = await currentUser();
  const patch = {
    name: body.name ?? user.name,
    email: body.email ?? user.email,
    phone: body.phone ?? user.phone,
    bio: body.bio ?? user.bio,
    dark_mode: body.darkMode ?? user.darkMode,
    email_notifications: body.emailNotifications ?? user.emailNotifications,
  };
  const { data, error } = await supabase.from('users').update(patch).eq('id', user.id).select().single();
  fail(error, 'Could not update profile.');
  if (body.email && body.email !== user.email) {
    const { error: authError } = await supabase.auth.updateUser({ email: body.email });
    fail(authError, 'Profile saved, but Supabase could not update the auth email.');
  }
  return { user: mapUser(data) };
}

async function updatePassword(_currentPassword, newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  fail(error, 'Could not update password.');
  return { ok: true };
}

async function createClass(body) {
  const user = await currentUser();
  const title = body.title || body.name;
  const code = (body.code || title.replace(/[^a-z0-9]/gi, '').slice(0, 4) + Math.floor(100 + Math.random() * 900)).toUpperCase();
  const { data, error } = await supabase.from('classes').insert({
    title,
    teacher_id: user.id,
    code,
    description: body.description || '',
    schedule: body.schedule || '',
    room: body.room || '',
    color: colors[Math.floor(Math.random() * colors.length)],
  }).select().single();
  fail(error, 'Could not create class.');
  return { class: mapClass(data, [user], []) };
}

async function joinClass(code) {
  const user = await currentUser();
  const { data: cls, error } = await supabase.from('classes').select('*').ilike('code', code.trim()).maybeSingle();
  fail(error, 'Could not find class.');
  if (!cls) throw new ApiError('Class not found. Check the code.', { status: 404 });
  const { error: joinError } = await supabase.from('class_enrollments').insert({ user_id: user.id, class_id: cls.id });
  fail(joinError, 'Could not join class.');
  await notify(cls.teacher_id, `${user.name} joined ${cls.title}`, '👤');
  return { class: mapClass(cls, [], [{ user_id: user.id, class_id: cls.id }]) };
}

async function createAssignment(body) {
  const user = await currentUser();
  const { data, error } = await supabase.from('assignments').insert({
    class_id: body.classId,
    title: body.title,
    description: body.description || '',
    due_date: body.dueDate,
    points: body.points || 100,
    type: body.type || 'Assignment',
    status: body.status || 'active',
  }).select().single();
  fail(error, 'Could not create assignment.');
  const { data: cls } = await supabase.from('classes').select('*').eq('id', body.classId).maybeSingle();
  await supabase.from('events').insert({
    title: body.title,
    date: body.dueDate,
    type: String(body.type || '').toLowerCase() === 'quiz' ? 'quiz' : 'assignment',
    color: cls?.color || '#6366f1',
    class_id: body.classId,
    assignment_id: data.id,
  });
  const { data: enrolled = [] } = await supabase.from('class_enrollments').select('user_id').eq('class_id', body.classId);
  await Promise.all(enrolled.map((row) => notify(row.user_id, `New assignment: ${body.title}`, '📝')));
  await notify(user.id, `Created assignment: ${body.title}`, '📝');
  return { assignment: mapAssignment(data, []) };
}

async function submitAssignment(assignmentId, file, fileName) {
  const user = await currentUser();
  let uploadedPath = null;
  const finalName = file?.name || fileName || 'submission.txt';
  if (file) {
    uploadedPath = `${user.id}/${assignmentId}/${Date.now()}-${finalName}`;
    const { error } = await supabase.storage.from('submissions').upload(uploadedPath, file, { upsert: true });
    fail(error, 'Could not upload submission file.');
  }
  const { data, error } = await supabase.from('submissions').upsert({
    assignment_id: assignmentId,
    student_id: user.id,
    file_name: finalName,
    file_path: uploadedPath,
    submitted_at: new Date().toISOString(),
    status: 'submitted',
    grade: null,
  }, { onConflict: 'assignment_id,student_id' }).select().single();
  fail(error, 'Could not submit assignment.');
  return { submission: mapSubmission(data, [user]) };
}

async function gradeSubmission(id, grade, feedback) {
  const { data, error } = await supabase
    .from('submissions')
    .update({ grade, feedback: feedback || '', status: 'graded' })
    .eq('id', id)
    .select()
    .single();
  fail(error, 'Could not grade submission.');
  await notify(data.student_id, 'Your submission was graded.', '✅');
  return { submission: mapSubmission(data, []) };
}

async function createAnnouncement(body) {
  const user = await currentUser();
  const { data, error } = await supabase.from('announcements').insert({
    class_id: body.classId,
    author_id: user.id,
    title: body.title,
    body: body.body,
    pinned: !!body.pinned,
  }).select().single();
  fail(error, 'Could not post announcement.');
  return { announcement: mapAnnouncement(data, [user], []) };
}

async function uploadMaterial(classId, title, type, file) {
  let uploadedPath = null;
  if (file) {
    uploadedPath = `${classId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('materials').upload(uploadedPath, file, { upsert: true });
    fail(error, 'Could not upload material.');
  }
  const { data, error } = await supabase.from('materials').insert({
    class_id: classId,
    title: title || file?.name || 'Material',
    type: type || 'pdf',
    file_name: file?.name || title || 'Material',
    file_path: uploadedPath,
    size_bytes: file?.size || 0,
    icon: type === 'zip' ? '📦' : type === 'slides' ? '📊' : '📄',
  }).select().single();
  fail(error, 'Could not save material.');
  return { material: mapMaterial(data) };
}

async function createEvent(body) {
  const { data, error } = await supabase.from('events').insert({
    title: body.title,
    date: body.date,
    type: body.type || 'event',
    color: body.color || '#10b981',
    class_id: body.classId || null,
  }).select().single();
  fail(error, 'Could not create event.');
  return { event: data };
}

async function createUser(body) {
  const { data, error } = await supabase.from('users').insert({
    id: crypto.randomUUID(),
    name: body.name,
    email: String(body.email || '').toLowerCase(),
    role: body.role || 'student',
    department: body.department || null,
    major: body.major || null,
    year: body.year || null,
    phone: body.phone || null,
    bio: body.bio || null,
    avatar: initials(body.name),
  }).select().single();
  fail(error, 'Could not create user profile.');
  return { user: mapUser(data) };
}

async function updateUser(id, body) {
  const { data, error } = await supabase.from('users').update({
    name: body.name,
    email: body.email,
    role: body.role,
    department: body.department,
    major: body.major,
    year: body.year,
    phone: body.phone,
    bio: body.bio,
  }).eq('id', id).select().single();
  fail(error, 'Could not update user.');
  return { user: mapUser(data) };
}

async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  fail(error, 'Could not delete user.');
  return { ok: true };
}

async function getClassAttendance(classId, date) {
  const [users, enrollmentsResult, rowsResult] = await Promise.all([
    getTable('users'),
    supabase.from('class_enrollments').select('*').eq('class_id', classId),
    supabase.from('attendance').select('*').eq('class_id', classId),
  ]);
  fail(enrollmentsResult.error, 'Could not load class roster.');
  fail(rowsResult.error, 'Could not load attendance.');
  const roster = (enrollmentsResult.data || []).map((e) => users.find((u) => u.id === e.user_id)).filter(Boolean);
  const rows = rowsResult.data || [];
  const byStudent = new Map(rows.filter((r) => r.session_date === date).map((r) => [r.student_id, r]));
  const records = roster.map((student) => ({
    id: byStudent.get(student.id)?.id,
    studentId: student.id,
    studentName: student.name,
    avatar: student.avatar,
    status: byStudent.get(student.id)?.status || 'present',
    note: byStudent.get(student.id)?.note || '',
  }));
  const history = [...new Set(rows.map((r) => r.session_date))].sort().reverse().map((sessionDate) => {
    const sessionRows = rows.filter((r) => r.session_date === sessionDate);
    const presentCount = sessionRows.filter((r) => r.status === 'present' || r.status === 'late').length;
    return {
      date: sessionDate,
      presentCount,
      total: sessionRows.length,
      percentage: sessionRows.length ? Math.round((presentCount / sessionRows.length) * 100) : 0,
    };
  });
  return { records, history, sessionDate: date };
}

async function saveClassAttendance(classId, date, records) {
  const rows = records.map((r) => ({
    class_id: classId,
    student_id: r.studentId,
    session_date: date,
    status: r.status || 'present',
    note: r.note || '',
  }));
  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,class_id,session_date' });
  fail(error, 'Could not save attendance.');
  return getClassAttendance(classId, date);
}

async function signedDownload(bucket, path) {
  if (!path) throw new ApiError('No uploaded file is attached.', { status: 404 });
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  fail(error, 'Could not create download link.');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export const api = {
  logout: () => supabase.auth.signOut(),
  login,
  register,
  me: async () => ({ user: await currentUser() }),
  bootstrap,
  updateProfile,
  updatePassword,
  createUser,
  updateUser,
  deleteUser,
  createClass,
  joinClass,
  createAssignment,
  submitAssignment,
  gradeSubmission,
  downloadSubmission: async (id) => {
    const { data, error } = await supabase.from('submissions').select('file_path').eq('id', id).maybeSingle();
    fail(error, 'Could not find submission.');
    return signedDownload('submissions', data?.file_path);
  },
  createAnnouncement,
  uploadMaterial,
  downloadMaterial: async (id) => {
    const { data, error } = await supabase.from('materials').select('file_path').eq('id', id).maybeSingle();
    fail(error, 'Could not find material.');
    return signedDownload('materials', data?.file_path);
  },
  createEvent,
  markNotificationRead: async (id) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    fail(error, 'Could not mark notification read.');
    return { ok: true };
  },
  markAllNotificationsRead: async () => {
    const user = await currentUser();
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    fail(error, 'Could not mark notifications read.');
    return { ok: true };
  },
  getReports: bootstrap,
  getSettings: async () => Object.fromEntries((await getTable('settings')).map((s) => [s.key, s.value])),
  updateSettings: async (body) => {
    const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await supabase.from('settings').upsert(rows);
    fail(error, 'Could not save settings.');
    return { ok: true };
  },
  resetData: async () => {
    const filters = {
      attendance: ['class_id', '00000000-0000-0000-0000-000000000000'],
      submissions: ['id', '00000000-0000-0000-0000-000000000000'],
      materials: ['id', '00000000-0000-0000-0000-000000000000'],
      announcements: ['id', '00000000-0000-0000-0000-000000000000'],
      events: ['id', '00000000-0000-0000-0000-000000000000'],
      assignments: ['id', '00000000-0000-0000-0000-000000000000'],
      class_enrollments: ['class_id', '00000000-0000-0000-0000-000000000000'],
      classes: ['id', '00000000-0000-0000-0000-000000000000'],
    };
    for (const [table, [column, value]] of Object.entries(filters)) {
      const { error } = await supabase.from(table).delete().neq(column, value);
      fail(error, `Could not reset ${table}.`);
    }
    return { ok: true };
  },
  getClassAttendance,
  saveClassAttendance,
};
