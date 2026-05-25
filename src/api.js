import { supabase } from './lib/supabaseClient.js';

const TABLES = {
  users: 'users',
  classrooms: 'classrooms',
  enrollments: 'enrollments',
  assignments: 'assignments',
  submissions: 'submissions',
  announcements: 'announcements',
  materials: 'materials',
  events: 'events',
  notifications: 'notifications',
  attendance: 'attendance',
  settings: 'settings',
};

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const classColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export function getToken() {
  return Object.keys(localStorage).some((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
}

export function setToken() {
  // Supabase Auth owns browser session persistence.
}

function fail(error, fallback = 'Supabase request failed.') {
  if (!error) return;
  const message = error.code === '23505'
    ? 'This record already exists.'
    : error.message || fallback;
  throw new ApiError(message || fallback, {
    status: Number(error.status) || 0,
    details: error.details || error.code || message,
  });
}

function initials(name = '') {
  return name.split(' ').map((word) => word[0]).join('').toUpperCase().slice(0, 2) || 'SC';
}

function timeAgo(iso) {
  if (!iso) return 'Just now';
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatSize(bytes = 0) {
  if (!bytes) return 'No file';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function generateJoinCode(name = 'CLASS') {
  const prefix = name.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase() || 'CLSS';
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
}

function mapUser(row) {
  const name = row.full_name || row.name || row.email || 'SmartClass User';
  return {
    id: row.id,
    name,
    fullName: name,
    email: row.email || '',
    role: row.role || 'student',
    avatar: initials(name),
    department: row.department || '',
    major: row.major || '',
    year: row.year || '',
    phone: row.phone || '',
    bio: row.bio || '',
    darkMode: !!row.dark_mode,
    emailNotifications: row.email_notifications !== false,
    createdAt: row.created_at,
  };
}

function mapClass(row, users = [], enrollments = []) {
  const teacher = users.find((user) => user.id === row.teacher_id);
  return {
    id: row.id,
    name: row.name || row.title,
    title: row.name || row.title,
    code: row.join_code || row.code,
    joinCode: row.join_code || row.code,
    teacherId: row.teacher_id,
    teacher: teacher?.full_name || teacher?.name || 'Teacher',
    color: row.color || classColors[Math.abs(String(row.id).charCodeAt(0) || 0) % classColors.length],
    icon: row.icon || '📚',
    students: enrollments.filter((enrollment) => enrollment.class_id === row.id).length,
    description: row.description || '',
    schedule: row.schedule || '',
    room: row.room || '',
    maxStudents: row.max_students || 50,
    createdAt: row.created_at,
  };
}

function mapAssignment(row, submissions = []) {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description || '',
    dueDate: row.due_date,
    points: Number(row.points || 100),
    status: row.status || 'active',
    submissions: submissions.filter((submission) => submission.assignment_id === row.id).length,
    type: row.type || 'Assignment',
    createdAt: row.created_at,
  };
}

function mapSubmission(row, users = []) {
  const student = users.find((user) => user.id === row.student_id);
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    studentName: student?.full_name || student?.name || 'Student',
    avatar: initials(student?.full_name || student?.name),
    submittedAt: row.submitted_at,
    file: row.file_name || (row.file_url ? 'Uploaded file' : ''),
    filePath: row.file_path,
    fileUrl: row.file_url,
    textAnswer: row.text_answer || '',
    grade: row.grade,
    feedback: row.feedback || '',
    status: row.status || (row.grade != null ? 'graded' : 'submitted'),
  };
}

function mapAnnouncement(row, users = [], classes = []) {
  const author = users.find((user) => user.id === row.author_id);
  const cls = classes.find((item) => item.id === row.class_id);
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    body: row.body,
    teacher: author?.full_name || author?.name || 'Teacher',
    avatar: initials(author?.full_name || author?.name),
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
    icon: row.type === 'zip' ? '📦' : row.type === 'slides' ? '📊' : '📄',
    filePath: row.file_path,
    fileName: row.file_name,
  };
}

async function getTable(table, select = '*') {
  const { data, error } = await supabase.from(table).select(select);
  fail(error, `Could not load ${table}.`);
  return data || [];
}

async function currentSession() {
  const { data, error } = await supabase.auth.getSession();
  fail(error, 'Could not read the current session.');
  return data.session;
}

async function currentUser() {
  const session = await currentSession();
  if (!session?.user) throw new ApiError('Unauthorized', { status: 401 });

  const { data, error } = await supabase.from(TABLES.users).select('*').eq('id', session.user.id).maybeSingle();
  fail(error, 'Could not load your profile.');
  if (!data) throw new ApiError('User profile not found. Create a profile or run supabase/schema.sql.', { status: 404 });
  return mapUser(data);
}

function visibleClassIds(user, classRows, enrollmentRows) {
  if (user.role === 'admin') return classRows.map((cls) => cls.id);
  if (user.role === 'teacher') return classRows.filter((cls) => cls.teacher_id === user.id).map((cls) => cls.id);
  return enrollmentRows.filter((enrollment) => enrollment.student_id === user.id).map((enrollment) => enrollment.class_id);
}

async function notify(userId, text, icon = 'bell') {
  if (!userId) return;
  await supabase.from('notifications').insert({ user_id: userId, text, icon });
}

function buildClassStudents(classes, users, enrollments) {
  return Object.fromEntries(classes.map((cls) => [
    cls.id,
    enrollments
      .filter((enrollment) => enrollment.class_id === cls.id)
      .map((enrollment) => users.find((user) => user.id === enrollment.student_id))
      .filter(Boolean)
      .map(mapUser),
  ]));
}

function buildAttendanceSummary(user, classes, attendanceRows) {
  if (user.role === 'student') {
    return classes.map((cls) => {
      const rows = attendanceRows.filter((row) => row.student_id === user.id && row.class_id === cls.id);
      const present = rows.filter((row) => row.status === 'present' || row.status === 'late').length;
      return {
        classId: cls.id,
        className: cls.name,
        code: cls.code,
        color: cls.color,
        icon: cls.icon,
        totalSessions: rows.length,
        presentCount: present,
        absentCount: rows.filter((row) => row.status === 'absent').length,
        lateCount: rows.filter((row) => row.status === 'late').length,
        percentage: rows.length ? Math.round((present / rows.length) * 100) : null,
      };
    }).filter((row) => row.totalSessions);
  }

  return classes.map((cls) => {
    const rows = attendanceRows.filter((row) => row.class_id === cls.id);
    return {
      classId: cls.id,
      className: cls.name,
      code: cls.code,
      color: cls.color,
      icon: cls.icon,
      totalSessions: new Set(rows.map((row) => row.session_date)).size,
      totalRecords: rows.length,
      absentCount: rows.filter((row) => row.status === 'absent').length,
    };
  });
}

async function bootstrap() {
  const user = await currentUser();
  const [
    userRows,
    classRows,
    enrollmentRows,
    assignmentRows,
    submissionRows,
    announcementRows,
    materialRows,
    eventRows,
    notificationRows,
    attendanceRows,
    settingsRows,
  ] = await Promise.all([
    getTable(TABLES.users),
    getTable(TABLES.classrooms),
    getTable(TABLES.enrollments),
    getTable(TABLES.assignments),
    getTable(TABLES.submissions),
    getTable(TABLES.announcements),
    getTable(TABLES.materials),
    getTable(TABLES.events),
    getTable(TABLES.notifications),
    getTable(TABLES.attendance),
    getTable(TABLES.settings),
  ]);

  const ids = visibleClassIds(user, classRows, enrollmentRows);
  const visibleClasses = classRows.filter((cls) => ids.includes(cls.id));
  const visibleAssignments = assignmentRows.filter((assignment) => ids.includes(assignment.class_id));
  const allUsers = userRows.map(mapUser);
  const classes = visibleClasses.map((cls) => mapClass(cls, userRows, enrollmentRows));
  const assignments = visibleAssignments.map((assignment) => mapAssignment(assignment, submissionRows));

  const submissions = (['teacher', 'admin'].includes(user.role)
    ? submissionRows.filter((submission) => visibleAssignments.some((assignment) => assignment.id === submission.assignment_id))
    : submissionRows.filter((submission) => submission.student_id === user.id)
  ).map((submission) => mapSubmission(submission, userRows));

  const submissionsByAssignment = new Map(submissions.map((submission) => [submission.assignmentId, submission]));
  const assignmentsWithStudentState = user.role === 'student'
    ? assignments.map((assignment) => {
      const submission = submissionsByAssignment.get(assignment.id);
      return {
        ...assignment,
        submitted: !!submission,
        submissionStatus: submission?.status || null,
        submissionGrade: submission?.grade ?? null,
        submissionFeedback: submission?.feedback || '',
        submittedAt: submission?.submittedAt || null,
      };
    })
    : assignments;

  const announcements = announcementRows
    .filter((announcement) => ids.includes(announcement.class_id))
    .map((announcement) => mapAnnouncement(announcement, userRows, classRows));
  const materials = materialRows.filter((material) => ids.includes(material.class_id)).map(mapMaterial);
  const events = eventRows
    .filter((event) => !event.class_id || ids.includes(event.class_id))
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      type: event.type,
      color: event.color,
      classId: event.class_id,
    }));
  const notifications = notificationRows
    .filter((notification) => notification.user_id === user.id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 50)
    .map((notification) => ({
      id: notification.id,
      text: notification.text,
      time: timeAgo(notification.created_at),
      read: !!notification.read,
      icon: notification.icon,
    }));

  const graded = submissions.filter((submission) => submission.status === 'graded' && submission.grade != null);
  const attendanceSummary = buildAttendanceSummary(user, classes, attendanceRows);
  const attendanceRecent = user.role === 'student'
    ? attendanceRows
      .filter((row) => row.student_id === user.id)
      .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
      .slice(0, 20)
      .map((row) => ({
        id: row.id,
        status: row.status,
        note: row.note || '',
        date: row.session_date,
        classId: row.class_id,
        className: classes.find((cls) => cls.id === row.class_id)?.name || 'Class',
      }))
    : [];

  return {
    classes,
    assignments: assignmentsWithStudentState,
    announcements,
    materials,
    events,
    notifications,
    submissions,
    users: user.role === 'admin'
      ? allUsers
      : user.role === 'teacher'
        ? allUsers.filter((item) => item.role === 'student')
        : [],
    classStudents: buildClassStudents(visibleClasses, userRows, enrollmentRows),
    settings: Object.fromEntries(settingsRows.map((setting) => [setting.key, setting.value])),
    attendanceSummary,
    attendanceRecent,
    stats: {
      enrolledClasses: user.role === 'student' ? classes.length : undefined,
      pendingTasks: user.role === 'student' ? assignmentsWithStudentState.filter((assignment) => assignment.status === 'active' && !assignment.submitted).length : undefined,
      submittedCount: user.role === 'student' ? submissions.length : undefined,
      gradedCount: user.role === 'student' ? graded.length : undefined,
      gpa: null,
      attendancePercentage: user.role === 'student' && attendanceSummary.length
        ? Math.round(attendanceSummary.reduce((sum, row) => sum + (row.percentage || 0), 0) / attendanceSummary.length)
        : undefined,
      pendingGrades: user.role === 'teacher' ? submissions.filter((submission) => submission.status === 'submitted').length : undefined,
      totalStudents: user.role === 'teacher' ? classes.reduce((sum, cls) => sum + cls.students, 0) : undefined,
    },
  };
}

async function login(email, password) {
  if (!email?.trim() || !password) throw new ApiError('Email and password are required.', { status: 400 });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  fail(error, 'Invalid email or password.');
  return { token: data.session?.access_token, user: await currentUser() };
}

async function register(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const fullName = String(body.name || body.fullName || '').trim();
  const role = ['student', 'teacher'].includes(body.role) ? body.role : 'student';
  if (!fullName) throw new ApiError('Full name is required.', { status: 400 });
  if (!email) throw new ApiError('Email is required.', { status: 400 });
  if (!body.password || body.password.length < 8) throw new ApiError('Password must be at least 8 characters.', { status: 400 });
  const { data, error } = await supabase.auth.signUp({
    email,
    password: body.password,
    options: { data: { full_name: fullName, name: fullName, role } },
  });
  fail(error, 'Could not create your account.');
  if (!data.user) throw new ApiError('Could not create your account.', { status: 400 });
  if (!data.session) {
    throw new ApiError('Account created. Confirm your email before signing in.', { status: 202 });
  }

  const { error: profileError } = await supabase.from(TABLES.users).upsert({
    id: data.user.id,
    full_name: fullName,
    email,
    role,
  });
  fail(profileError, 'Could not create your profile.');
  return { token: data.session?.access_token, user: await currentUser() };
}

async function createUser(body) {
  const admin = await currentUser();
  if (admin.role !== 'admin') throw new ApiError('Only admins can create users.', { status: 403 });

  const { data: sessionData } = await supabase.auth.getSession();
  const originalSession = sessionData.session;
  const email = String(body.email || '').trim().toLowerCase();
  const fullName = String(body.name || body.fullName || '').trim();
  const requestedRole = ['student', 'teacher', 'admin'].includes(body.role) ? body.role : 'student';
  if (!fullName || !email) throw new ApiError('Name and email are required.', { status: 400 });
  if (!body.password || body.password.length < 8) throw new ApiError('Password must be at least 8 characters.', { status: 400 });

  const { data, error } = await supabase.auth.signUp({
    email,
    password: body.password,
    options: { data: { full_name: fullName, name: fullName, role: requestedRole === 'admin' ? 'student' : requestedRole } },
  });
  fail(error, 'Could not create user.');

  if (originalSession?.access_token && originalSession?.refresh_token) {
    const restored = await supabase.auth.setSession({
      access_token: originalSession.access_token,
      refresh_token: originalSession.refresh_token,
    });
    fail(restored.error, 'Could not restore admin session.');
  }

  if (!data.user) throw new ApiError('Could not create user.', { status: 400 });

  const { data: profile, error: profileError } = await supabase.from(TABLES.users).upsert({
    id: data.user.id,
    full_name: fullName,
    email,
    role: requestedRole,
  }).select().single();
  fail(profileError, 'Could not create user profile.');

  return { user: mapUser(profile) };
}

async function updateProfile(body) {
  const user = await currentUser();
  const patch = {
    full_name: body.name ?? body.fullName ?? user.name,
    email: body.email ?? user.email,
    phone: body.phone ?? user.phone,
    bio: body.bio ?? user.bio,
    dark_mode: body.darkMode ?? user.darkMode,
    email_notifications: body.emailNotifications ?? user.emailNotifications,
  };
  const { data, error } = await supabase.from(TABLES.users).update(patch).eq('id', user.id).select().single();
  fail(error, 'Could not update profile.');
  return { user: mapUser(data) };
}

async function updatePassword(_currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new ApiError('New password must be at least 8 characters.', { status: 400 });
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  fail(error, 'Could not update password.');
  return { ok: true };
}

async function createClass(body) {
  const user = await currentUser();
  if (!['teacher', 'admin'].includes(user.role)) throw new ApiError('Only teachers can create classrooms.', { status: 403 });
  const name = String(body.name || body.title || '').trim();
  if (!name) throw new ApiError('Classroom name is required.', { status: 400 });
  const joinCode = generateJoinCode(name);
  const { data, error } = await supabase.from(TABLES.classrooms).insert({
    name,
    description: body.description || '',
    teacher_id: user.id,
    join_code: joinCode,
    schedule: body.schedule || '',
    room: body.room || '',
    color: classColors[Math.floor(Math.random() * classColors.length)],
  }).select().single();
  fail(error, 'Could not create class.');
  return { class: mapClass(data, [{ id: user.id, full_name: user.name }], []) };
}

async function joinClass(code) {
  const user = await currentUser();
  if (user.role !== 'student') throw new ApiError('Only students can join classes.', { status: 403 });
  const { data: cls, error } = await supabase
    .from(TABLES.classrooms)
    .select('*')
    .ilike('join_code', String(code || '').trim())
    .maybeSingle();
  fail(error, 'Could not find class.');
  if (!cls) throw new ApiError('Class not found. Check the join code.', { status: 404 });

  const { error: joinError } = await supabase.from(TABLES.enrollments).insert({ class_id: cls.id, student_id: user.id });
  fail(joinError, 'Could not join class. You may already be enrolled.');
  await notify(cls.teacher_id, `${user.name} joined ${cls.name}`, 'user-plus');
  return { class: mapClass(cls, [], [{ class_id: cls.id, student_id: user.id }]) };
}

async function createAssignment(body) {
  const user = await currentUser();
  if (!['teacher', 'admin'].includes(user.role)) throw new ApiError('Only teachers can create assignments.', { status: 403 });
  if (!body.classId) throw new ApiError('Choose a classroom before creating an assignment.', { status: 400 });
  if (!body.title?.trim()) throw new ApiError('Assignment title is required.', { status: 400 });
  if (!body.dueDate) throw new ApiError('Due date is required.', { status: 400 });
  const { data, error } = await supabase.from(TABLES.assignments).insert({
    class_id: body.classId,
    title: body.title,
    description: body.description || '',
    due_date: body.dueDate,
    points: body.points || 100,
    type: body.type || 'Assignment',
    status: 'active',
  }).select().single();
  fail(error, 'Could not create assignment.');

  await supabase.from(TABLES.events).insert({
    title: body.title,
    date: body.dueDate,
    type: String(body.type || '').toLowerCase() === 'quiz' ? 'quiz' : 'assignment',
    color: '#6366f1',
    class_id: body.classId,
    assignment_id: data.id,
  });

  const { data: enrolled = [] } = await supabase.from(TABLES.enrollments).select('student_id').eq('class_id', body.classId);
  await Promise.all(enrolled.map((row) => notify(row.student_id, `New assignment: ${body.title}`, 'assignment')));
  return { assignment: mapAssignment(data, []) };
}

async function submitAssignment(assignmentId, file, fileName, textAnswer = '') {
  const user = await currentUser();
  if (user.role !== 'student') throw new ApiError('Only students can submit assignments.', { status: 403 });
  let uploadedPath = null;
  let signedUrl = null;
  const finalName = file?.name || fileName || '';

  if (file) {
    uploadedPath = `${user.id}/${assignmentId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('submissions').upload(uploadedPath, file, { upsert: true });
    fail(error, 'Could not upload submission file.');
    const signed = await supabase.storage.from('submissions').createSignedUrl(uploadedPath, 60 * 60 * 24 * 7);
    signedUrl = signed.data?.signedUrl || null;
  }

  if (!textAnswer?.trim() && !file) {
    throw new ApiError('Add a text answer or upload a file before submitting.', { status: 400 });
  }

  const { data, error } = await supabase.from(TABLES.submissions).upsert({
    assignment_id: assignmentId,
    student_id: user.id,
    file_url: signedUrl,
    file_path: uploadedPath,
    file_name: finalName,
    text_answer: textAnswer || '',
    grade: null,
    feedback: '',
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'assignment_id,student_id' }).select().single();
  fail(error, 'Could not submit assignment.');
  return { submission: mapSubmission(data, [user]) };
}

async function gradeSubmission(id, grade, feedback) {
  const { data, error } = await supabase
    .from(TABLES.submissions)
    .update({ grade, feedback: feedback || '', status: 'graded', graded_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  fail(error, 'Could not grade submission.');
  await notify(data.student_id, `Your submission was graded: ${grade}`, 'grade');
  return { submission: mapSubmission(data, []) };
}

async function createAnnouncement(body) {
  const user = await currentUser();
  if (!body.classId) throw new ApiError('Choose a classroom before posting.', { status: 400 });
  if (!body.title?.trim() || !body.body?.trim()) throw new ApiError('Announcement title and body are required.', { status: 400 });
  const { data, error } = await supabase.from(TABLES.announcements).insert({
    class_id: body.classId,
    author_id: user.id,
    title: body.title,
    body: body.body,
    pinned: !!body.pinned,
  }).select().single();
  fail(error, 'Could not post announcement.');
  return { announcement: mapAnnouncement(data, [{ id: user.id, full_name: user.name }], []) };
}

async function uploadMaterial(classId, title, type, file) {
  if (!classId) throw new ApiError('Choose a classroom before uploading material.', { status: 400 });
  if (!title?.trim() && !file) throw new ApiError('Add a title or choose a file.', { status: 400 });
  let uploadedPath = null;
  if (file) {
    uploadedPath = `${classId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('materials').upload(uploadedPath, file, { upsert: true });
    fail(error, 'Could not upload material.');
  }
  const { data, error } = await supabase.from(TABLES.materials).insert({
    class_id: classId,
    title: title || file?.name || 'Material',
    type: type || 'pdf',
    file_name: file?.name || title || 'Material',
    file_path: uploadedPath,
    size_bytes: file?.size || 0,
  }).select().single();
  fail(error, 'Could not save material.');
  return { material: mapMaterial(data) };
}

async function createEvent(body) {
  if (!body.title?.trim() || !body.date) throw new ApiError('Event title and date are required.', { status: 400 });
  const { data, error } = await supabase.from(TABLES.events).insert({
    title: body.title,
    date: body.date,
    type: body.type || 'event',
    color: body.color || '#10b981',
    class_id: body.classId || null,
  }).select().single();
  fail(error, 'Could not create event.');
  return { event: data };
}

async function getClassAttendance(classId, date) {
  const [users, enrollmentsResult, rowsResult] = await Promise.all([
    getTable(TABLES.users),
    supabase.from(TABLES.enrollments).select('*').eq('class_id', classId),
    supabase.from(TABLES.attendance).select('*').eq('class_id', classId),
  ]);
  fail(enrollmentsResult.error, 'Could not load class roster.');
  fail(rowsResult.error, 'Could not load attendance.');
  const roster = (enrollmentsResult.data || []).map((enrollment) => users.find((user) => user.id === enrollment.student_id)).filter(Boolean);
  const rows = rowsResult.data || [];
  const byStudent = new Map(rows.filter((row) => row.session_date === date).map((row) => [row.student_id, row]));
  const records = roster.map((student) => ({
    id: byStudent.get(student.id)?.id,
    studentId: student.id,
    studentName: student.full_name || student.name,
    avatar: initials(student.full_name || student.name),
    status: byStudent.get(student.id)?.status || 'present',
    note: byStudent.get(student.id)?.note || '',
  }));
  const history = [...new Set(rows.map((row) => row.session_date))].sort().reverse().map((sessionDate) => {
    const sessionRows = rows.filter((row) => row.session_date === sessionDate);
    const presentCount = sessionRows.filter((row) => row.status === 'present' || row.status === 'late').length;
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
  const rows = records.map((record) => ({
    class_id: classId,
    student_id: record.studentId,
    session_date: date,
    status: record.status || 'present',
    note: record.note || '',
  }));
  const { error } = await supabase.from(TABLES.attendance).upsert(rows, { onConflict: 'student_id,class_id,session_date' });
  fail(error, 'Could not save attendance.');
  return getClassAttendance(classId, date);
}

async function signedDownload(bucket, path) {
  if (!path) throw new ApiError('No uploaded file is attached.', { status: 404 });
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  fail(error, 'Could not create download link.');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

async function updateSettings(body) {
  const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await supabase.from(TABLES.settings).upsert(rows);
  fail(error, 'Could not save settings.');
  return { ok: true };
}

async function resetData() {
  const user = await currentUser();
  if (user.role !== 'admin') throw new ApiError('Only admins can reset workspace data.', { status: 403 });
  for (const table of [TABLES.attendance, TABLES.submissions, TABLES.materials, TABLES.announcements, TABLES.events, TABLES.assignments, TABLES.enrollments, TABLES.classrooms]) {
    const { error } = await supabase.from(table).delete().neq('created_at', '1900-01-01T00:00:00Z');
    fail(error, `Could not reset ${table}.`);
  }
  return { ok: true };
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
  updateUser: async (id, body) => {
    const current = await currentUser();
    if (current.role !== 'admin' && current.id !== id) throw new ApiError('Only admins can update other users.', { status: 403 });
    const { data, error } = await supabase.from(TABLES.users).update({
      full_name: body.name || body.fullName,
      email: body.email,
      role: body.role,
    }).eq('id', id).select().single();
    fail(error, 'Could not update user.');
    return { user: mapUser(data) };
  },
  deleteUser: async (id) => {
    const current = await currentUser();
    if (current.role !== 'admin') throw new ApiError('Only admins can delete users.', { status: 403 });
    const { error } = await supabase.from(TABLES.users).delete().eq('id', id);
    fail(error, 'Could not delete user.');
    return { ok: true };
  },
  createClass,
  joinClass,
  createAssignment,
  submitAssignment,
  gradeSubmission,
  downloadSubmission: async (id) => {
    const { data, error } = await supabase.from(TABLES.submissions).select('file_path').eq('id', id).maybeSingle();
    fail(error, 'Could not find submission.');
    return signedDownload('submissions', data?.file_path);
  },
  createAnnouncement,
  uploadMaterial,
  downloadMaterial: async (id) => {
    const { data, error } = await supabase.from(TABLES.materials).select('file_path').eq('id', id).maybeSingle();
    fail(error, 'Could not find material.');
    return signedDownload('materials', data?.file_path);
  },
  createEvent,
  markNotificationRead: async (id) => {
    const { error } = await supabase.from(TABLES.notifications).update({ read: true }).eq('id', id);
    fail(error, 'Could not mark notification read.');
    return { ok: true };
  },
  markAllNotificationsRead: async () => {
    const user = await currentUser();
    const { error } = await supabase.from(TABLES.notifications).update({ read: true }).eq('user_id', user.id);
    fail(error, 'Could not mark notifications read.');
    return { ok: true };
  },
  getReports: bootstrap,
  getSettings: async () => Object.fromEntries((await getTable(TABLES.settings)).map((setting) => [setting.key, setting.value])),
  updateSettings,
  resetData,
  getClassAttendance,
  saveClassAttendance,
};
