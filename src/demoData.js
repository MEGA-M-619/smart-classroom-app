const today = new Date();
const isoDate = (offsetDays = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

export const demoAccounts = [
  {
    label: "Teacher Demo",
    email: "sarah@university.edu",
    password: "teacher123",
    user: {
      id: "demo-teacher",
      name: "Sarah Mitchell",
      fullName: "Sarah Mitchell",
      email: "sarah@university.edu",
      role: "teacher",
      avatar: "SM",
      department: "Computer Science",
      phone: "+1 555 0134",
      bio: "Instructor focused on practical software engineering and human-centered systems.",
      darkMode: false,
      emailNotifications: true,
    },
  },
  {
    label: "Student Demo",
    email: "alex@student.edu",
    password: "student123",
    user: {
      id: "demo-student",
      name: "Alex Carter",
      fullName: "Alex Carter",
      email: "alex@student.edu",
      role: "student",
      avatar: "AC",
      major: "Software Engineering",
      year: "Sophomore",
      phone: "+1 555 0148",
      bio: "Building better study habits one assignment at a time.",
      darkMode: false,
      emailNotifications: true,
    },
  },
  {
    label: "Admin Demo",
    email: "admin@system.edu",
    password: "admin123",
    user: {
      id: "demo-admin",
      name: "Jordan Lee",
      fullName: "Jordan Lee",
      email: "admin@system.edu",
      role: "admin",
      avatar: "JL",
      department: "Academic Technology",
      phone: "+1 555 0199",
      bio: "Keeping SmartClass organized for the whole institution.",
      darkMode: false,
      emailNotifications: true,
    },
  },
];

const users = [
  demoAccounts[0].user,
  demoAccounts[1].user,
  demoAccounts[2].user,
  {
    id: "demo-student-2",
    name: "Maya Patel",
    fullName: "Maya Patel",
    email: "maya@student.edu",
    role: "student",
    avatar: "MP",
    major: "Data Science",
    year: "Junior",
    darkMode: false,
    emailNotifications: true,
  },
];

const classes = [
  {
    id: "class-se",
    name: "Software Engineering",
    title: "Software Engineering",
    code: "SOFT2481",
    joinCode: "SOFT2481",
    teacherId: "demo-teacher",
    teacher: "Sarah Mitchell",
    color: "#6366f1",
    icon: "SE",
    students: 2,
    description: "Agile delivery, testing, design reviews, and production readiness.",
    schedule: "Mon/Wed 10:00 AM",
    room: "Lab 204",
    maxStudents: 40,
  },
  {
    id: "class-db",
    name: "Database Systems",
    title: "Database Systems",
    code: "DATA9021",
    joinCode: "DATA9021",
    teacherId: "demo-teacher",
    teacher: "Sarah Mitchell",
    color: "#10b981",
    icon: "DB",
    students: 2,
    description: "Relational modeling, SQL, indexing, transactions, and data integrity.",
    schedule: "Tue/Thu 1:30 PM",
    room: "Room 118",
    maxStudents: 35,
  },
];

const assignments = [
  {
    id: "assignment-api",
    classId: "class-se",
    title: "API Design Review",
    description: "Review an existing API surface and propose changes for reliability.",
    dueDate: isoDate(5),
    points: 100,
    status: "active",
    submissions: 1,
    type: "Assignment",
    submitted: false,
    submissionStatus: null,
    submissionGrade: null,
    submissionFeedback: "",
  },
  {
    id: "assignment-sql",
    classId: "class-db",
    title: "SQL Query Lab",
    description: "Write joins and aggregate reports for the enrollment dataset.",
    dueDate: isoDate(-3),
    points: 80,
    status: "active",
    submissions: 2,
    type: "Lab",
    submitted: true,
    submissionStatus: "graded",
    submissionGrade: 74,
    submissionFeedback: "Strong query structure. Add notes for index choices next time.",
    submittedAt: isoDate(-4),
  },
];

const submissions = [
  {
    id: "submission-alex-sql",
    assignmentId: "assignment-sql",
    studentId: "demo-student",
    studentName: "Alex Carter",
    avatar: "AC",
    submittedAt: isoDate(-4),
    file: "sql-query-lab.pdf",
    filePath: null,
    fileUrl: null,
    textAnswer: "Completed the reporting queries and added explanations for each join.",
    grade: 74,
    feedback: "Strong query structure. Add notes for index choices next time.",
    status: "graded",
  },
  {
    id: "submission-maya-api",
    assignmentId: "assignment-api",
    studentId: "demo-student-2",
    studentName: "Maya Patel",
    avatar: "MP",
    submittedAt: isoDate(-1),
    file: "api-review-notes.docx",
    filePath: null,
    fileUrl: null,
    textAnswer: "Focused on validation, pagination, and error consistency.",
    grade: null,
    feedback: "",
    status: "submitted",
  },
];

const announcements = [
  {
    id: "ann-welcome",
    classId: "class-se",
    title: "Sprint planning starts this week",
    body: "Bring one product idea and one technical risk to discuss in your project teams.",
    teacher: "Sarah Mitchell",
    avatar: "SM",
    date: isoDate(-2),
    pinned: true,
    color: "#6366f1",
  },
  {
    id: "ann-lab",
    classId: "class-db",
    title: "Database lab room changed",
    body: "Thursday's lab will meet in Room 118 so everyone can use the database workstations.",
    teacher: "Sarah Mitchell",
    avatar: "SM",
    date: isoDate(-5),
    pinned: false,
    color: "#10b981",
  },
];

const materials = [
  {
    id: "material-rubric",
    classId: "class-se",
    title: "Project Rubric",
    type: "pdf",
    size: "248 KB",
    date: isoDate(-7),
    icon: "PDF",
    filePath: null,
    fileName: "project-rubric.pdf",
  },
  {
    id: "material-schema",
    classId: "class-db",
    title: "Schema Design Slides",
    type: "slides",
    size: "1.2 MB",
    date: isoDate(-9),
    icon: "PPT",
    filePath: null,
    fileName: "schema-design-slides.pdf",
  },
];

const events = [
  { id: "event-api", title: "API Design Review due", date: isoDate(5), type: "assignment", color: "#6366f1", classId: "class-se" },
  { id: "event-quiz", title: "Normalization Quiz", date: isoDate(9), type: "quiz", color: "#f59e0b", classId: "class-db" },
  { id: "event-demo", title: "Team demo day", date: isoDate(17), type: "event", color: "#10b981", classId: "class-se" },
];

const notifications = [
  { id: "notif-1", text: "API Design Review is due soon.", time: "2h ago", read: false, icon: "assignment" },
  { id: "notif-2", text: "Your SQL Query Lab was graded.", time: "1d ago", read: true, icon: "grade" },
];

const attendanceRecords = [
  { id: "att-1", classId: "class-se", studentId: "demo-student", studentName: "Alex Carter", sessionDate: isoDate(-14), status: "present", note: "" },
  { id: "att-2", classId: "class-se", studentId: "demo-student", studentName: "Alex Carter", sessionDate: isoDate(-7), status: "late", note: "Arrived after standup." },
  { id: "att-3", classId: "class-se", studentId: "demo-student", studentName: "Alex Carter", sessionDate: isoDate(-2), status: "present", note: "" },
  { id: "att-4", classId: "class-db", studentId: "demo-student", studentName: "Alex Carter", sessionDate: isoDate(-10), status: "present", note: "" },
  { id: "att-5", classId: "class-db", studentId: "demo-student", studentName: "Alex Carter", sessionDate: isoDate(-3), status: "absent", note: "Excused." },
  { id: "att-6", classId: "class-se", studentId: "demo-student-2", studentName: "Maya Patel", sessionDate: isoDate(-2), status: "present", note: "" },
];

function attendanceSummaryFor(user, visibleClasses, records) {
  if (user.role === "student") {
    return visibleClasses.map((cls) => {
      const rows = records.filter((row) => row.studentId === user.id && row.classId === cls.id);
      const present = rows.filter((row) => row.status === "present" || row.status === "late").length;
      return {
        classId: cls.id,
        className: cls.name,
        code: cls.code,
        color: cls.color,
        icon: cls.icon,
        totalSessions: rows.length,
        presentCount: present,
        absentCount: rows.filter((row) => row.status === "absent").length,
        lateCount: rows.filter((row) => row.status === "late").length,
        percentage: rows.length ? Math.round((present / rows.length) * 100) : null,
      };
    }).filter((row) => row.totalSessions);
  }

  return visibleClasses.map((cls) => {
    const rows = records.filter((row) => row.classId === cls.id);
    return {
      classId: cls.id,
      className: cls.name,
      code: cls.code,
      color: cls.color,
      icon: cls.icon,
      totalSessions: new Set(rows.map((row) => row.sessionDate)).size,
      totalRecords: rows.length,
      absentCount: rows.filter((row) => row.status === "absent").length,
    };
  });
}

export function findDemoAccount(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  return demoAccounts.find((account) => account.email === normalized && account.password === password);
}

export function createDemoWorkspace(account) {
  const user = { ...account.user };
  const visibleClasses = user.role === "student"
    ? classes
    : user.role === "teacher"
      ? classes.filter((cls) => cls.teacherId === user.id)
      : classes;
  const visibleClassIds = new Set(visibleClasses.map((cls) => cls.id));
  const visibleAssignments = assignments
    .filter((assignment) => visibleClassIds.has(assignment.classId))
    .map((assignment) => ({ ...assignment }));
  const visibleSubmissions = user.role === "student"
    ? submissions.filter((submission) => submission.studentId === user.id)
    : submissions.filter((submission) => visibleAssignments.some((assignment) => assignment.id === submission.assignmentId));
  const summary = attendanceSummaryFor(user, visibleClasses, attendanceRecords);

  return {
    user,
    data: {
      classes: visibleClasses.map((cls) => ({ ...cls })),
      assignments: visibleAssignments,
      announcements: announcements.filter((announcement) => visibleClassIds.has(announcement.classId)).map((announcement) => ({ ...announcement })),
      materials: materials.filter((material) => visibleClassIds.has(material.classId)).map((material) => ({ ...material })),
      events: events.filter((event) => !event.classId || visibleClassIds.has(event.classId)).map((event) => ({ ...event })),
      notifications: notifications.map((notification) => ({ ...notification })),
      submissions: visibleSubmissions.map((submission) => ({ ...submission })),
      users: user.role === "admin" ? users.map((item) => ({ ...item })) : users.filter((item) => item.role === "student").map((item) => ({ ...item })),
      classStudents: Object.fromEntries(visibleClasses.map((cls) => [cls.id, users.filter((item) => item.role === "student").map((item) => ({ ...item }))])),
      settings: {
        institution_name: "SmartClass University",
        academic_year: "2025-2026",
        max_class_size: "50",
      },
      attendanceSummary: summary,
      attendanceRecent: attendanceRecords
        .filter((row) => row.studentId === user.id)
        .map((row) => ({
          id: row.id,
          status: row.status,
          note: row.note,
          date: row.sessionDate,
          classId: row.classId,
          className: classes.find((cls) => cls.id === row.classId)?.name || "Class",
        })),
      attendanceRecords: attendanceRecords.map((row) => ({ ...row })),
      stats: {
        enrolledClasses: user.role === "student" ? visibleClasses.length : undefined,
        pendingTasks: user.role === "student" ? visibleAssignments.filter((assignment) => assignment.status === "active" && !assignment.submitted).length : undefined,
        submittedCount: user.role === "student" ? visibleSubmissions.length : undefined,
        gradedCount: visibleSubmissions.filter((submission) => submission.status === "graded").length,
        gpa: user.role === "student" ? 3.62 : null,
        attendancePercentage: user.role === "student" && summary.length
          ? Math.round(summary.reduce((sum, row) => sum + (row.percentage || 0), 0) / summary.length)
          : undefined,
        pendingGrades: user.role === "teacher" ? visibleSubmissions.filter((submission) => submission.status === "submitted").length : undefined,
        totalStudents: user.role === "teacher" ? users.filter((item) => item.role === "student").length : undefined,
      },
    },
  };
}
