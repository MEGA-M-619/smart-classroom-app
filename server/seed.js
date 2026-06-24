import bcrypt from 'bcryptjs';
import { db, initSchema } from './db.js';

initSchema();

const hash = (p) => bcrypt.hashSync(p, 10);

db.exec(`
  DELETE FROM parent_student_links;
  DELETE FROM notifications;
  DELETE FROM attendance_records;
  DELETE FROM attendance_sessions;
  DELETE FROM submissions;
  DELETE FROM materials;
  DELETE FROM announcements;
  DELETE FROM events;
  DELETE FROM assignments;
  DELETE FROM enrollments;
  DELETE FROM classes;
  DELETE FROM users;
  DELETE FROM settings;
`);
db.exec(`DELETE FROM sqlite_sequence WHERE name IN (
  'users','classes','assignments','submissions','announcements','materials','events','notifications',
  'attendance_sessions','attendance_records'
);`);

const userId = (email) => db.prepare('SELECT id FROM users WHERE email = ?').get(email).id;
const classId = (code) => db.prepare('SELECT id FROM classes WHERE code = ?').get(code).id;

const users = [
  { name: 'Dr. Sarah Mitchell', email: 'sarah@university.edu', password: 'teacher123', role: 'teacher', department: 'Computer Science', phone: '+1 (555) 234-5678', bio: '10+ years teaching CS fundamentals.' },
  { name: 'Alex Johnson', email: 'alex@student.edu', password: 'student123', role: 'student', major: 'Software Engineering', year: 'Junior', phone: '+1 (555) 345-6789', bio: 'Passionate about full-stack development.' },
  { name: 'Admin Root', email: 'admin@system.edu', password: 'admin123', role: 'admin', department: 'IT Administration', phone: '+1 (555) 000-0001', bio: 'System administrator.' },
  { name: 'Prof. James Carter', email: 'james@university.edu', password: 'teacher123', role: 'teacher', department: 'Mathematics', phone: '+1 (555) 456-7890', bio: 'Specializes in applied mathematics.' },
  { name: 'Maria Santos', email: 'maria@student.edu', password: 'student123', role: 'student', major: 'Data Science', year: 'Senior', phone: '+1 (555) 567-8901', bio: 'AI/ML enthusiast.' },
  { name: 'Emma Williams', email: 'emma@student.edu', password: 'student123', role: 'student', major: 'Computer Science', year: 'Sophomore', phone: '+1 (555) 678-9012', bio: 'Focus on cybersecurity.' },
  { name: 'Robert Johnson', email: 'parent@family.edu', password: 'parent123', role: 'parent', phone: '+1 (555) 789-0123', bio: 'Parent of Alex Johnson.' },
];

const insUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role, department, major, year, phone, bio, avatar)
  VALUES (@name, @email, @password_hash, @role, @department, @major, @year, @phone, @bio, @avatar)
`);

for (const u of users) {
  const avatar = u.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  insUser.run({
    name: u.name,
    email: u.email,
    password_hash: hash(u.password),
    role: u.role,
    department: u.department || null,
    major: u.major || null,
    year: u.year || null,
    phone: u.phone || null,
    bio: u.bio || null,
    avatar,
  });
}

const classes = [
  { name: 'Web Development Fundamentals', code: 'WEB301', teacherEmail: 'sarah@university.edu', color: '#6366f1', icon: '💻', semester: 'Spring 2025', description: 'Modern web technologies including HTML5, CSS3, React and Node.js.', schedule: 'Mon/Wed 10:00–11:30 AM', room: 'Lab B-204' },
  { name: 'Data Structures & Algorithms', code: 'DSA201', teacherEmail: 'sarah@university.edu', color: '#f59e0b', icon: '🧩', semester: 'Spring 2025', description: 'Core algorithmic thinking and data structure design.', schedule: 'Tue/Thu 2:00–3:30 PM', room: 'Hall A-101' },
  { name: 'Calculus III', code: 'MATH301', teacherEmail: 'james@university.edu', color: '#10b981', icon: '📐', semester: 'Spring 2025', description: 'Multivariable calculus and vector analysis.', schedule: 'Mon/Wed/Fri 9:00–10:00 AM', room: 'Hall C-301' },
  { name: 'Database Systems', code: 'DB401', teacherEmail: 'sarah@university.edu', color: '#ec4899', icon: '🗄️', semester: 'Spring 2025', description: 'Relational databases, SQL, and NoSQL systems.', schedule: 'Fri 1:00–4:00 PM', room: 'Lab B-102' },
];

const insClass = db.prepare(`INSERT INTO classes (name, code, teacher_id, color, icon, semester, description, schedule, room) VALUES (@name, @code, @teacher_id, @color, @icon, @semester, @description, @schedule, @room)`);
for (const c of classes) {
  const { teacherEmail, ...rest } = c;
  insClass.run({ ...rest, teacher_id: userId(teacherEmail) });
}

const enrollments = [
  ['alex@student.edu', 'WEB301'],
  ['alex@student.edu', 'DSA201'],
  ['alex@student.edu', 'MATH301'],
  ['maria@student.edu', 'WEB301'],
  ['maria@student.edu', 'DSA201'],
  ['emma@student.edu', 'WEB301'],
  ['emma@student.edu', 'MATH301'],
];
const insEnroll = db.prepare('INSERT INTO enrollments (user_id, class_id) VALUES (?, ?)');
for (const [email, code] of enrollments) insEnroll.run(userId(email), classId(code));

const assignments = [
  { classCode: 'WEB301', title: 'React To-Do App', description: 'Build a fully functional to-do app with React hooks, localStorage persistence, and responsive UI.', due_date: '2025-05-28', points: 100, status: 'active', type: 'Project' },
  { classCode: 'WEB301', title: 'CSS Grid Layout Challenge', description: 'Recreate the provided design mockup using CSS Grid and Flexbox.', due_date: '2025-05-20', points: 50, status: 'active', type: 'Assignment' },
  { classCode: 'DSA201', title: 'Binary Search Tree Implementation', description: 'Implement a BST with insert, delete, and traversal methods in Python.', due_date: '2025-05-22', points: 80, status: 'active', type: 'Lab' },
  { classCode: 'DSA201', title: 'Sorting Algorithm Analysis', description: 'Compare time complexity of QuickSort, MergeSort, and HeapSort with benchmarks.', due_date: '2025-06-01', points: 60, status: 'active', type: 'Assignment' },
  { classCode: 'MATH301', title: 'Vector Fields Quiz', description: 'Online quiz covering gradient, divergence, and curl of vector fields.', due_date: '2025-05-19', points: 30, status: 'graded', type: 'Quiz' },
  { classCode: 'DB401', title: 'Database Design Project', description: 'Design a normalized database schema for a hospital management system.', due_date: '2025-06-10', points: 120, status: 'active', type: 'Project' },
];
const insAsgn = db.prepare(`INSERT INTO assignments (class_id, title, description, due_date, points, status, type) VALUES (@class_id, @title, @description, @due_date, @points, @status, @type)`);
for (const a of assignments) {
  const { classCode, ...rest } = a;
  insAsgn.run({ ...rest, class_id: classId(classCode) });
}

const assignmentId = (title) => db.prepare('SELECT id FROM assignments WHERE title = ?').get(title).id;
const insSub = db.prepare(`INSERT INTO submissions (assignment_id, student_id, file_name, file_path, submitted_at, grade, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
insSub.run(assignmentId('CSS Grid Layout Challenge'), userId('alex@student.edu'), 'css_layout_alex.zip', null, '2025-05-18 14:22:00', 47, 'graded');
insSub.run(assignmentId('CSS Grid Layout Challenge'), userId('maria@student.edu'), 'layout_maria.zip', null, '2025-05-19 09:10:00', null, 'submitted');
insSub.run(assignmentId('CSS Grid Layout Challenge'), userId('emma@student.edu'), 'grid_emma.zip', null, '2025-05-19 21:55:00', null, 'submitted');

const announcements = [
  { classCode: 'WEB301', authorEmail: 'sarah@university.edu', title: 'Office Hours Change — This Week', body: 'My Thursday office hours are moved to 4:00 PM due to a faculty meeting.', pinned: 1 },
  { classCode: 'DSA201', authorEmail: 'sarah@university.edu', title: 'Midterm Results Posted', body: 'Midterm grades have been posted on the portal. Average score was 74%.', pinned: 0 },
  { classCode: 'MATH301', authorEmail: 'james@university.edu', title: 'Extra Credit Opportunity', body: 'A 10-point extra credit problem has been added to the homework portal.', pinned: 0 },
  { classCode: 'WEB301', authorEmail: 'sarah@university.edu', title: 'Guest Speaker: Friday May 23', body: 'We will have a senior engineer from Stripe joining us.', pinned: 1 },
];
const insAnn = db.prepare(`INSERT INTO announcements (class_id, author_id, title, body, pinned, created_at) VALUES (@class_id, @author_id, @title, @body, @pinned, datetime('now', '-' || @days || ' days'))`);
const annDays = [1, 2, 3, 4];
announcements.forEach((a, i) => {
  const { classCode, authorEmail, ...rest } = a;
  insAnn.run({ ...rest, class_id: classId(classCode), author_id: userId(authorEmail), days: annDays[i] });
});

const materials = [
  { classCode: 'WEB301', title: 'Week 8: React Hooks Deep Dive', type: 'slides', size_bytes: 2516582, icon: '📊' },
  { classCode: 'WEB301', title: 'React Project Starter Template', type: 'zip', size_bytes: 159744, icon: '📦' },
  { classCode: 'WEB301', title: 'Course Syllabus Spring 2025', type: 'pdf', size_bytes: 348160, icon: '📄' },
  { classCode: 'DSA201', title: 'BST Lecture Notes', type: 'pdf', size_bytes: 1153434, icon: '📄' },
  { classCode: 'DSA201', title: 'Algorithm Complexity Cheatsheet', type: 'pdf', size_bytes: 532480, icon: '📄' },
  { classCode: 'MATH301', title: 'Vector Calculus Formulas', type: 'pdf', size_bytes: 819200, icon: '📄' },
];
const insMat = db.prepare(`INSERT INTO materials (class_id, title, type, size_bytes, icon) VALUES (@class_id, @title, @type, @size_bytes, @icon)`);
for (const m of materials) {
  const { classCode, ...rest } = m;
  insMat.run({ ...rest, class_id: classId(classCode) });
}

const events = [
  { title: 'React App Due', date: '2025-05-28', type: 'assignment', color: '#6366f1', assignmentTitle: 'React To-Do App' },
  { title: 'CSS Layout Due', date: '2025-05-20', type: 'assignment', color: '#6366f1', assignmentTitle: 'CSS Grid Layout Challenge' },
  { title: 'BST Implementation Due', date: '2025-05-22', type: 'assignment', color: '#f59e0b', assignmentTitle: 'Binary Search Tree Implementation' },
  { title: 'Guest Speaker – Stripe', date: '2025-05-23', type: 'event', color: '#10b981', classCode: 'WEB301' },
  { title: 'Vector Fields Quiz', date: '2025-05-19', type: 'quiz', color: '#ec4899', assignmentTitle: 'Vector Fields Quiz' },
  { title: 'DB Design Project Due', date: '2025-06-10', type: 'assignment', color: '#ec4899', assignmentTitle: 'Database Design Project' },
];
const insEv = db.prepare(`INSERT INTO events (title, date, type, color, class_id, assignment_id) VALUES (@title, @date, @type, @color, @class_id, @assignment_id)`);
for (const e of events) {
  insEv.run({
    title: e.title,
    date: e.date,
    type: e.type,
    color: e.color,
    class_id: e.classCode ? classId(e.classCode) : null,
    assignment_id: e.assignmentTitle ? assignmentId(e.assignmentTitle) : null,
  });
}

const notifs = [
  { email: 'alex@student.edu', text: 'Dr. Mitchell graded your CSS Layout assignment', icon: '✅', read: 0 },
  { email: 'alex@student.edu', text: 'New announcement in Web Dev: Office Hours Change', icon: '📢', read: 0 },
  { email: 'alex@student.edu', text: 'Reminder: BST Implementation due in 7 days', icon: '⏰', read: 1 },
  { email: 'alex@student.edu', text: 'Maria Santos joined Web Development', icon: '👤', read: 1 },
];
const insN = db.prepare(`INSERT INTO notifications (user_id, text, icon, read, created_at) VALUES (@user_id, @text, @icon, @read, datetime('now', '-' || @hours || ' hours'))`);
const hours = [2, 5, 24, 48];
notifs.forEach((n, i) => insN.run({ user_id: userId(n.email), text: n.text, icon: n.icon, read: n.read, hours: hours[i] }));

const attendanceDates = ['2025-05-12', '2025-05-14', '2025-05-16', '2025-05-19', '2025-05-21'];
const insSession = db.prepare('INSERT INTO attendance_sessions (class_id, session_date, created_by) VALUES (?, ?, ?)');
const insRecord = db.prepare('INSERT INTO attendance_records (session_id, student_id, status, note) VALUES (?, ?, ?, ?)');

for (const code of ['WEB301', 'DSA201']) {
  const cid = classId(code);
  for (const date of attendanceDates) {
    const session = insSession.run(cid, date, userId('sarah@university.edu'));
    const sessionId = session.lastInsertRowid;
    const students = enrollments
      .filter(([, classCode]) => classCode === code)
      .map(([email]) => userId(email));
    students.forEach((studentId, index) => {
      const status = index === 0 && date === '2025-05-19' ? 'late' : index === 2 && date === '2025-05-14' ? 'absent' : 'present';
      insRecord.run(sessionId, studentId, status, status === 'absent' ? 'Unexcused' : '');
    });
  }
}

db.prepare(`INSERT INTO settings (key, value) VALUES ('institution_name', 'SmartClass University')`).run();
db.prepare(`INSERT INTO settings (key, value) VALUES ('academic_year', '2024–2025')`).run();
db.prepare(`INSERT INTO settings (key, value) VALUES ('max_class_size', '50')`).run();

db.prepare('INSERT INTO parent_student_links (parent_id, student_id, relationship) VALUES (?, ?)').run(
  userId('parent@family.edu'),
  userId('alex@student.edu'),
);

console.log('Database seeded successfully.');
