import { useState, useEffect } from "react";
import { useApp } from "./app-context.js";
import { getToken } from "./api.js";
import { api } from "./api.js";
import { ClassActionModals } from "./classModals.jsx";
import { AttendancePage } from "./pages/AttendancePage.jsx";
import { Onboarding } from "./pages/Onboarding.jsx";
import { GradebookPage } from "./pages/GradebookPage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";
import { AIPage } from "./pages/AIPage.jsx";
import { DiscussionsPage } from "./pages/DiscussionsPage.jsx";
import { ParentPortalPage } from "./pages/ParentPortalPage.jsx";
import { MessagesPage } from "./pages/MessagesPage.jsx";
import { AcademicCalendarPage } from "./pages/CalendarPage.jsx";
import { RubricGrader } from "./components/RubricGrader.jsx";
import { useToast } from "./components/Toast.jsx";
import { useTheme, resolveDarkMode } from "./hooks/useTheme.js";
import { useNotificationStream } from "./hooks/useNotificationStream.js";

// ─── Colors & Theme ───────────────────────────────────────────────────────────
const COLORS = {
  indigo: "#6366f1", indigoDark: "#4f46e5", indigoLight: "#e0e7ff",
  amber: "#f59e0b", amberLight: "#fef3c7",
  emerald: "#10b981", emeraldLight: "#d1fae5",
  pink: "#ec4899", pinkLight: "#fce7f3",
  slate: "#64748b", slateLight: "#f1f5f9",
  white: "#ffffff", bg: "#f8fafc",
  text: "#1e293b", textMuted: "#64748b",
  border: "#e2e8f0",
};

// ─── Utility ──────────────────────────────────────────────────────────────────
const getInitials = (name) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const formatGpa = (gpa) => gpa == null ? "N/A" : Number(gpa).toFixed(2);
const submittedBadgeLabel = (assignment) => {
  if (assignment.submissionStatus === "graded") return `Graded ${assignment.submissionGrade}/${assignment.points}`;
  if (assignment.submitted) return "Submitted";
  return assignment.status;
};

// ─── Components ───────────────────────────────────────────────────────────────

function Avatar({ name, color = COLORS.indigo, size = 36 }) {
  return (
    <div className="sca-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {getInitials(name)}
    </div>
  );
}

function Badge({ type, label }) {
  return <span className={`sca-badge sca-tag-${type}`}>{label}</span>;
}

function EmptyState({ title = 'Nothing here yet', body = 'New activity will appear here when it is available.' }) {
  return <div className="sca-empty"><p style={{ fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>{title}</p><p style={{ fontSize: 13 }}>{body}</p></div>;
}

function StatCard({ label, value, icon, color = COLORS.indigo, sub }) {
  return (
    <div className="sca-stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{sub}</p>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="sca-modal-bg" onClick={onClose}>
      <div className="sca-modal fade-in" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 18 }}>{title}</h3>
          <button className="sca-btn sca-btn-ghost" style={{ padding: "6px 10px" }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 60px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: COLORS.indigo, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>SmartClass</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="sca-btn sca-btn-ghost" onClick={onLogin}>Sign In</button>
          <button className="sca-btn sca-btn-primary" onClick={onLogin}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 40px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#e0e7ff", color: COLORS.indigo, padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          ✨ New for Spring 2025
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, color: COLORS.text, lineHeight: 1.15, maxWidth: 700, marginBottom: 20 }}>
          The Classroom Platform Built for <span style={{ color: COLORS.indigo }}>Modern Education</span>
        </h1>
        <p style={{ fontSize: 18, color: COLORS.textMuted, maxWidth: 540, lineHeight: 1.7, marginBottom: 36 }}>
          Manage classes, assignments, and announcements in one beautifully simple platform. For teachers and students who deserve better tools.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="sca-btn sca-btn-primary" style={{ padding: "14px 28px", fontSize: 16 }} onClick={onLogin}>Start for Free</button>
          <button className="sca-btn sca-btn-ghost" style={{ padding: "14px 28px", fontSize: 16 }} onClick={onLogin}>See Demo →</button>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 72, maxWidth: 860, width: "100%" }}>
          {[
            { icon: "📚", title: "Smart Course Management", desc: "Create, organize, and share course materials with a few clicks." },
            { icon: "📝", title: "Assignment Tracking", desc: "Post assignments, collect submissions, and grade — all in one place." },
            { icon: "📅", title: "Integrated Calendar", desc: "Never miss a deadline with a unified academic calendar view." },
          ].map(f => (
            <div key={f.title} className="sca-card" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div style={{ marginTop: 56, display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {[{ v: "2,400+", l: "Students" }, { v: "180+", l: "Instructors" }, { v: "95%", l: "Satisfaction" }, { v: "40+", l: "Universities" }].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: COLORS.indigo }}>{s.v}</p>
              <p style={{ fontSize: 13, color: COLORS.textMuted }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ padding: "20px 60px", textAlign: "center", color: COLORS.textMuted, fontSize: 13, borderTop: "1px solid #e2e8f0" }}>
        © 2025 SmartClass — University Software Engineering Project
      </footer>
    </div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const { login, register } = useApp();
  const toast = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "student", studentEmail: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { label: "👨‍🏫 Teacher Demo", email: "sarah@university.edu", password: "teacher123" },
    { label: "👨‍🎓 Student Demo", email: "alex@student.edu", password: "student123" },
    { label: "🔧 Admin Demo", email: "admin@system.edu", password: "admin123" },
    { label: "👨‍👩‍👧 Parent Demo", email: "parent@family.edu", password: "parent123" },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const user = isLogin
        ? await login(form.email, form.password)
        : form.role === "parent"
          ? (await api.registerParent({ name: form.name, email: form.email, password: form.password, studentEmail: form.studentEmail }), await login(form.email, form.password))
          : await register({ name: form.name, email: form.email, password: form.password, role: form.role });
      onAuth(user);
    } catch (e) {
      const message = e.message || "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc" }}>
      {/* Left panel */}
      <div style={{ flex: 1, background: `linear-gradient(145deg, ${COLORS.indigo}, #818cf8)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, color: "#fff" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>SmartClass</h1>
        <p style={{ fontSize: 16, opacity: .85, textAlign: "center", lineHeight: 1.7, maxWidth: 320 }}>
          A modern classroom management platform for students and educators.
        </p>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
          {demoAccounts.map(d => (
            <button key={d.email} className="sca-btn" style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 10 }}
              onClick={() => { setForm(f => ({ ...f, email: d.email, password: d.password })); setError(""); }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{isLogin ? "Welcome back" : "Create account"}</h2>
          <p style={{ color: COLORS.textMuted, marginBottom: 28, fontSize: 14 }}>
            {isLogin ? "Sign in to your SmartClass account." : "Join thousands of learners today."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Full Name</label>
                <input className="sca-input" placeholder="Your full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Email</label>
              <input className="sca-input" type="email" placeholder="you@university.edu" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(""); }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Password</label>
              <input className="sca-input" type="password" placeholder="••••••••" value={form.password} onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(""); }} />
            </div>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Role</label>
                <select className="sca-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher / Instructor</option>
                  <option value="parent">Parent / Guardian</option>
                </select>
              </div>
            )}
            {!isLogin && form.role === "parent" && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }}>Student&apos;s school email</label>
                <input className="sca-input" type="email" placeholder="student@school.edu" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} />
              </div>
            )}
            {error && <p style={{ color: "#dc2626", fontSize: 13, background: "#fee2e2", padding: "10px 14px", borderRadius: 8 }}>{error}</p>}
            <button type="button" className="sca-btn sca-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, marginTop: 4 }} onClick={handleSubmit} disabled={loading}>
              {loading ? "Signing in…" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: COLORS.textMuted, marginTop: 20 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: COLORS.indigo, cursor: "pointer", fontWeight: 600 }} onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign up" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, page, setPage, onLogout, mobileOpen, onCloseMobile }) {
  const parentNav = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "parent", icon: "👨‍👩‍👧", label: "My Children" },
    { id: "messages", icon: "✉️", label: "Messages" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "announcements", icon: "📢", label: "Announcements" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  const studentNav = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "classes", icon: "📚", label: "My Classes" },
    { id: "assignments", icon: "📝", label: "Assignments" },
    { id: "submissions", icon: "📬", label: "My Submissions" },
    { id: "attendance", icon: "📋", label: "Attendance" },
    { id: "discussions", icon: "💬", label: "Discussions" },
    { id: "messages", icon: "✉️", label: "Messages" },
    { id: "ai", icon: "✨", label: "AI Coach" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "announcements", icon: "📢", label: "Announcements" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  const teacherNav = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "classes", icon: "📚", label: "My Classes" },
    { id: "assignments", icon: "📝", label: "Assignments" },
    { id: "gradebook", icon: "📊", label: "Gradebook" },
    { id: "submissions", icon: "📬", label: "Submissions" },
    { id: "attendance", icon: "📋", label: "Attendance" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "discussions", icon: "💬", label: "Discussions" },
    { id: "messages", icon: "✉️", label: "Messages" },
    { id: "ai", icon: "✨", label: "AI Studio" },
    { id: "calendar", icon: "📅", label: "Calendar" },
    { id: "announcements", icon: "📢", label: "Announcements" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  const adminNav = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "users", icon: "👥", label: "Users" },
    { id: "classes", icon: "📚", label: "All Classes" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "ai", icon: "✨", label: "AI Studio" },
    { id: "reports", icon: "📊", label: "Reports" },
    { id: "settings", icon: "⚙️", label: "Settings" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];

  const navItems = user.role === "admin" ? adminNav : user.role === "teacher" ? teacherNav : user.role === "parent" ? parentNav : studentNav;
  const roleColors = { student: COLORS.emerald, teacher: COLORS.indigo, admin: COLORS.amber, parent: COLORS.pink };

  return (
    <aside className={`sca-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Primary navigation">
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: COLORS.indigo, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎓</div>
          <span style={{ fontWeight: 700, fontSize: 17, color: COLORS.text }}>SmartClass</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 12 }}>
        {navItems.map(item => (
          <div key={item.id} className={`sca-nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); onCloseMobile?.(); }} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setPage(item.id)}>
            <span style={{ fontSize: 17 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 16px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 10, cursor: "pointer", marginBottom: 4 }} onClick={() => setPage("profile")}>
          <Avatar name={user.name} color={roleColors[user.role]} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name.split(" ")[0]}</p>
            <p style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "capitalize" }}>{user.role}</p>
          </div>
        </div>
        <button className="sca-btn sca-btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: 13 }} onClick={onLogout}>Sign Out</button>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ title, user, notifCount, onToggleTheme, onMenuClick }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div className="sca-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="sca-btn sca-btn-ghost sca-menu-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--sca-text)" }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button type="button" className="sca-btn sca-btn-ghost" style={{ padding: "8px 12px" }} onClick={onToggleTheme} aria-label="Toggle dark mode">
          {user.darkMode ? "☀️" : "🌙"}
        </button>
        <div style={{ position: "relative" }}>
          <button className="sca-btn sca-btn-ghost" style={{ padding: "8px 12px", position: "relative" }} onClick={() => setShowNotif(!showNotif)}>
            🔔
            {notifCount > 0 && <span className="sca-notif-badge" aria-label={`${notifCount} unread`}>{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
          {showNotif && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, background: "var(--sca-surface)", border: "1px solid var(--sca-border)", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,.12)", zIndex: 200 }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--sca-border)", fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Notifications</span>
                {notifCount > 0 && <button type="button" className="sca-btn sca-btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => markAllNotificationsRead()}>Mark all read</button>}
              </div>
              <div className="sca-notif-panel">
              {notifications.length === 0 && <p style={{ padding: 16, fontSize: 13, color: COLORS.textMuted }}>No notifications yet.</p>}
              {notifications.map(n => (
                <div key={n.id} role="button" tabIndex={0} onClick={() => !n.read && markNotificationRead(n.id)} style={{ padding: "12px 16px", borderBottom: "1px solid var(--sca-border)", display: "flex", gap: 10, alignItems: "flex-start", background: n.read ? "transparent" : "var(--sca-surface-muted)", cursor: 'pointer' }}>
                  <span style={{ fontSize: 16 }}>{n.icon}</span>
                  <div>
                    <p style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.text }}>{n.text}</p>
                    <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{n.time}</p>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
        <Avatar name={user.name} size={34} />
      </div>
    </div>
  );
}

// ─── Student Dashboard ────────────────────────────────────────────────────────
function StudentDashboard({ user, setPage }) {
  const { classes, assignments, announcements, submissions, stats } = useApp();
  const studentClasses = classes;
  const pendingAssignments = assignments.filter(a => a.status === "active" && !a.submitted);
  const upcoming = pendingAssignments.filter(a => daysUntil(a.dueDate) >= 0).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4);
  const gradedSubmissions = submissions.filter(s => s.status === "graded");

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      {/* Welcome */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.indigo}, #818cf8)`, borderRadius: 20, padding: "28px 32px", color: "#fff", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 14, opacity: .8, marginBottom: 4 }}>Welcome back,</p>
          <h2 style={{ fontSize: 26, fontWeight: 700 }}>{user.name.split(" ")[0]} 👋</h2>
          <p style={{ fontSize: 13, opacity: .75, marginTop: 6 }}>You have {pendingAssignments.length} pending tasks left</p>
        </div>
        <div style={{ fontSize: 64 }}>🎓</div>
      </div>

      {/* Stats */}
      <div className="sca-grid-4 sca-grid-stats-5" style={{ marginBottom: 24 }}>
        <StatCard label="Enrolled Classes" value={stats.enrolledClasses ?? classes.length} icon="📚" color={COLORS.indigo} />
        <StatCard label="Pending Tasks" value={stats.pendingTasks ?? pendingAssignments.length} icon="📝" color={COLORS.amber} />
        <StatCard label="Submitted" value={stats.submittedCount ?? submissions.length} icon="✅" color={COLORS.emerald} />
        <StatCard label="Attendance" value={stats.attendancePercentage != null ? `${stats.attendancePercentage}%` : "—"} icon="📋" color={COLORS.indigo} sub="Across classes" />
        <StatCard label="GPA" value={formatGpa(stats.gpa)} icon="⭐" color={COLORS.pink} sub={`${stats.gradedCount ?? gradedSubmissions.length} graded`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        {/* My Classes */}
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>My Classes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {studentClasses.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid #f1f5f9", borderRadius: 12, cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</p>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{c.teacher} · {c.schedule}</p>
                </div>
                <span className="sca-badge" style={{ background: c.color + "22", color: c.color }}>{c.code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Upcoming Deadlines</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.map(a => {
              const d = daysUntil(a.dueDate);
              return (
                <div key={a.id} style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{a.title}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Badge type={a.type.toLowerCase()} label={a.type} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: d <= 3 ? "#dc2626" : d <= 7 ? "#d97706" : COLORS.textMuted }}>
                      {d === 0 ? "Today!" : d === 1 ? "Tomorrow" : `${d}d left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="sca-card" style={{ marginTop: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Recent Announcements</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {announcements.slice(0, 3).map(a => (
            <div key={a.id} style={{ display: "flex", gap: 12, padding: "14px", borderLeft: `3px solid ${a.color}`, background: a.color + "08", borderRadius: "0 10px 10px 0" }}>
              <Avatar name={a.teacher} color={a.color} size={36} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</p>
                  {a.pinned && <span className="sca-badge" style={{ background: "#fef3c7", color: "#d97706", fontSize: 11 }}>📌 Pinned</span>}
                </div>
                <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{a.body}</p>
                <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{a.teacher} · {formatDate(a.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sca-card" style={{ marginTop: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>My Grades</h3>
        {gradedSubmissions.length === 0 ? (
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No graded work yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gradedSubmissions.slice(0, 4).map(s => {
              const a = assignments.find(item => item.id === s.assignmentId);
              return (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid #f1f5f9", borderRadius: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{a?.title || "Assignment"}</p>
                    {s.feedback && <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>{s.feedback}</p>}
                  </div>
                  <Badge type="graded" label={`${s.grade}/${a?.points ?? 100}`} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Teacher Dashboard ────────────────────────────────────────────────────────
function TeacherDashboard({ user, setPage }) {
  const { classes, assignments, submissions, stats, createClass } = useApp();
  const myClasses = classes;
  const totalStudents = stats.totalStudents ?? myClasses.reduce((s, c) => s + c.students, 0);
  const pending = stats.pendingGrades ?? submissions.filter(s => s.status === "submitted").length;
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", schedule: "", room: "" });

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ background: `linear-gradient(135deg, #4f46e5, #818cf8)`, borderRadius: 20, padding: "24px 28px", color: "#fff", flex: 1, marginRight: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ opacity: .8, fontSize: 14 }}>Good morning,</p>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>{user.name} 👋</h2>
            <p style={{ opacity: .75, fontSize: 13, marginTop: 4 }}>{myClasses.length} active classes · {pending} submissions to grade</p>
          </div>
          <div style={{ fontSize: 52 }}>📋</div>
        </div>
        <button className="sca-btn sca-btn-primary" style={{ padding: "12px 20px", whiteSpace: "nowrap" }} onClick={() => setShowCreate(true)}>
          + New Class
        </button>
      </div>

      <div className="sca-grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Active Classes" value={myClasses.length} icon="📚" color={COLORS.indigo} />
        <StatCard label="Total Students" value={totalStudents} icon="👥" color={COLORS.emerald} />
        <StatCard label="Pending Grades" value={pending} icon="📬" color={COLORS.amber} />
        <StatCard label="Assignments" value={assignments.filter(a => myClasses.some(c => c.id === a.classId)).length} icon="📝" color={COLORS.pink} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Your Classes</h3>
          {myClasses.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", border: "1px solid #f1f5f9", borderRadius: 12, marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</p>
                <p style={{ fontSize: 12, color: COLORS.textMuted }}>{c.students} students · {c.schedule}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="sca-badge" style={{ background: c.color + "22", color: c.color, display: "block", marginBottom: 4 }}>{c.code}</span>
                <p style={{ fontSize: 11, color: COLORS.textMuted }}>{c.room}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Recent Submissions</h3>
            {submissions.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
                <Avatar name={s.studentName} color={COLORS.emerald} size={32} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{s.studentName}</p>
                  <p style={{ fontSize: 11, color: COLORS.textMuted }}>{s.file}</p>
                </div>
                <Badge type={s.status} label={s.status === "graded" ? `${s.grade}pts` : "New"} />
              </div>
            ))}
          </div>

          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "📢 Post Announcement", page: "announcements" },
                { label: "📝 Create Assignment", page: "assignments" },
                { label: "📁 Upload Material", page: "classes" },
                { label: "📅 Add Calendar Event", page: "calendar" },
              ].map(a => (
                <button key={a.label} className="sca-btn sca-btn-ghost" style={{ justifyContent: "flex-start", fontSize: 13 }} onClick={() => setPage(a.page)}>{a.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <Modal title="Create New Class" onClose={() => setShowCreate(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Class Name *</label><input className="sca-input" placeholder="e.g. Introduction to Python" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Description</label><textarea className="sca-input" rows={3} placeholder="What will students learn?" style={{ resize: "none" }} value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="sca-grid-2">
              <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Schedule</label><input className="sca-input" placeholder="Mon/Wed 10:00 AM" value={createForm.schedule} onChange={e => setCreateForm(f => ({ ...f, schedule: e.target.value }))} /></div>
              <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Room</label><input className="sca-input" placeholder="Lab A-101" value={createForm.room} onChange={e => setCreateForm(f => ({ ...f, room: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => { if (!createForm.name?.trim()) return alert("Class name is required"); await createClass(createForm); setShowCreate(false); setCreateForm({ name: "", description: "", schedule: "", room: "" }); }}>Create Class</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const { users, classes } = useApp();
  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ background: "linear-gradient(135deg, #f59e0b, #fcd34d)", borderRadius: 20, padding: "24px 28px", color: "#78350f", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ opacity: .7, fontSize: 14 }}>System Overview</p>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Admin Control Center 🔧</h2>
          <p style={{ opacity: .75, fontSize: 13, marginTop: 4 }}>All systems operational · Last sync: Just now</p>
        </div>
        <div style={{ fontSize: 52 }}>⚙️</div>
      </div>

      <div className="sca-grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Total Users" value={users.length} icon="👥" color={COLORS.indigo} />
        <StatCard label="Active Classes" value={classes.length} icon="📚" color={COLORS.emerald} />
        <StatCard label="Institutions" value={3} icon="🏛️" color={COLORS.amber} />
        <StatCard label="System Health" value="99.8%" icon="💚" color={COLORS.emerald} />
      </div>

      <div className="sca-grid-2" style={{ marginBottom: 20 }}>
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>All Users</h3>
          <table className="sca-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={u.name} color={u.role === "teacher" ? COLORS.indigo : u.role === "admin" ? COLORS.amber : COLORS.emerald} size={30} />
                      <div><p style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</p><p style={{ fontSize: 11, color: COLORS.textMuted }}>{u.email}</p></div>
                    </div>
                  </td>
                  <td><Badge type={u.role === "teacher" ? "active" : u.role === "admin" ? "quiz" : "graded"} label={u.role} /></td>
                  <td><span style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>● Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>All Classes</h3>
            {classes.length === 0 && <EmptyState title="No classes yet" body="Create or join a class to start building your workspace." />}
          {classes.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: COLORS.textMuted }}>{c.teacher} · {c.students} students</p>
                </div>
                <span className="sca-badge" style={{ background: c.color + "22", color: c.color, fontSize: 11 }}>{c.code}</span>
              </div>
            ))}
          </div>

          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>System Activity</h3>
            {[
              { e: "New user registered", t: "2m ago", i: "👤" },
              { e: "Assignment submitted", t: "15m ago", i: "📝" },
              { e: "Class created: DB401", t: "1h ago", i: "📚" },
              { e: "File uploaded: Lecture8", t: "3h ago", i: "📁" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f8fafc", alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>{a.i}</span>
                <div style={{ flex: 1 }}><p style={{ fontSize: 13 }}>{a.e}</p></div>
                <p style={{ fontSize: 11, color: COLORS.textMuted }}>{a.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Classes Page ─────────────────────────────────────────────────────────────
function ClassesPage({ user, setPage }) {
  const { classes, materials, assignments, announcements, joinClass, createClass, createAssignment, createAnnouncement, uploadMaterial, submitAssignment, downloadMaterial, getClassInvite } = useApp();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("materials");
  const [joinModal, setJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateAsgn, setShowCreateAsgn] = useState(false);
  const [showPostAnn, setShowPostAnn] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [createClassForm, setCreateClassForm] = useState({ name: "", description: "", schedule: "", room: "" });
  const [asgnForm, setAsgnForm] = useState({ title: "", description: "", dueDate: "", points: 100, type: "Assignment", classId: "" });
  const [annForm, setAnnForm] = useState({ title: "", body: "", pinned: false, classId: "" });
  const [uploadForm, setUploadForm] = useState({ title: "", type: "pdf", file: null, classId: "" });
  const [submitModal, setSubmitModal] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const myClasses = classes;

  const modalProps = {
    user, classes, selected,
    joinModal, setJoinModal, joinCode, setJoinCode, joinClass,
    submitModal, setSubmitModal, submitFile, setSubmitFile, submitAssignment,
    showCreateClass, setShowCreateClass, createClassForm, setCreateClassForm, createClass,
    showCreateAsgn, setShowCreateAsgn, asgnForm, setAsgnForm, createAssignment,
    showUpload, setShowUpload, uploadForm, setUploadForm, uploadMaterial,
    showPostAnn, setShowPostAnn, annForm, setAnnForm, createAnnouncement,
  };

  if (selected) {
    const cls = classes.find(c => c.id === selected);
    const mats = materials.filter(m => m.classId === cls.id);
    const asgns = assignments.filter(a => a.classId === cls.id);
    const anncs = announcements.filter(a => a.classId === cls.id);

    return (
      <div className="fade-in" style={{ padding: 28 }}>
        <button className="sca-btn sca-btn-ghost" style={{ marginBottom: 16 }} onClick={() => setSelected(null)}>← Back to Classes</button>

        <div style={{ background: `linear-gradient(135deg, ${cls.color}, ${cls.color}cc)`, borderRadius: 20, padding: "28px 32px", color: "#fff", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 36 }}>{cls.icon}</span>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>{cls.name}</h2>
                  <p style={{ opacity: .8, fontSize: 14 }}>{cls.code} · {cls.semester}</p>
                </div>
              </div>
              <p style={{ opacity: .8, fontSize: 14, marginTop: 4 }}>{cls.description}</p>
              <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 13, opacity: .9 }}>
                <span>👩‍🏫 {cls.teacher}</span>
                <span>👥 {cls.students} students</span>
                <span>🕐 {cls.schedule}</span>
                <span>📍 {cls.room}</span>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.2)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 12, opacity: .8 }}>Class Code</p>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{cls.code}</p>
              {user.role === "teacher" && (
                <button type="button" className="sca-btn sca-btn-ghost" style={{ marginTop: 8, fontSize: 11, color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={async () => {
                  const inv = await getClassInvite(cls.id);
                  const link = inv.inviteUrl || `${window.location.origin}${inv.joinPath || ''}`;
                  await navigator.clipboard?.writeText(link);
                  alert('Invite link copied!');
                }}>Copy invite link</button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f1f5f9", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {["materials", "assignments", "announcements"].map(t => (
            <button key={t} className="sca-btn" onClick={() => setTab(t)}
              style={{ background: tab === t ? "#fff" : "transparent", color: tab === t ? COLORS.indigo : COLORS.textMuted, border: "none", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,.1)" : "none", textTransform: "capitalize" }}>
              {t === "materials" ? "📁" : t === "assignments" ? "📝" : "📢"} {t}
            </button>
          ))}
        </div>

        {tab === "materials" && (
          <div className="sca-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600 }}>Course Materials</h3>
              {user.role === "teacher" && <button className="sca-btn sca-btn-primary" style={{ fontSize: 13 }} onClick={() => { setUploadForm(f => ({ ...f, classId: selected })); setShowUpload(true); }}>+ Upload</button>}
            </div>
            {mats.length === 0 ? <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No materials yet.</p> : (
              <table className="sca-table">
                <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {mats.map(m => (
                    <tr key={m.id}>
                      <td><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ fontSize: 20 }}>{m.icon}</span><span style={{ fontWeight: 500 }}>{m.title}</span></div></td>
                      <td><Badge type="active" label={m.type.toUpperCase()} /></td>
                      <td style={{ color: COLORS.textMuted }}>{m.size}</td>
                      <td style={{ color: COLORS.textMuted }}>{formatDate(m.date)}</td>
                      <td><button className="sca-btn sca-btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => downloadMaterial(m.id, m.fileName || m.title)}>⬇ Download</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "assignments" && (
          <div className="sca-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600 }}>Assignments</h3>
              {user.role === "teacher" && <button className="sca-btn sca-btn-primary" style={{ fontSize: 13 }} onClick={() => { setAsgnForm(f => ({ ...f, classId: selected })); setShowCreateAsgn(true); }}>+ Create</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {asgns.map(a => {
                const d = daysUntil(a.dueDate);
                return (
                  <div key={a.id} style={{ border: "1px solid #f1f5f9", borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <p style={{ fontWeight: 600, fontSize: 15 }}>{a.title}</p>
                        <Badge type={a.type.toLowerCase()} label={a.type} />
                      </div>
                      <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{a.description}</p>
                      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>
                        <span>📅 Due {formatDate(a.dueDate)}</span>
                        <span>⭐ {a.points} pts</span>
                        {user.role === "student" && a.submitted && <span style={{ color: COLORS.emerald, fontWeight: 600 }}>Submitted and handed to teacher</span>}
                        {user.role === "student" && a.submissionStatus === "graded" && <span style={{ color: COLORS.emerald, fontWeight: 600 }}>Grade: {a.submissionGrade}/{a.points}</span>}
                        {user.role === "teacher" && <span>📬 {a.submissions} submissions</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: d <= 3 ? "#dc2626" : d <= 7 ? "#d97706" : COLORS.textMuted, marginBottom: 8 }}>
                        {d < 0 ? "Closed" : d === 0 ? "Due Today!" : `${d}d left`}
                      </p>
                      {user.role === "student" && (
                        <button className={a.submitted ? "sca-btn sca-btn-ghost" : "sca-btn sca-btn-primary"} style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setSubmitModal(a)}>
                          {a.submitted ? "Update Submission" : "Submit"}
                        </button>
                      )}
                      {user.role === "teacher" && <button className="sca-btn sca-btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setPage("submissions")}>View Submissions</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "announcements" && (
          <div className="sca-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600 }}>Announcements</h3>
              {user.role === "teacher" && <button className="sca-btn sca-btn-primary" style={{ fontSize: 13 }} onClick={() => { setAnnForm(f => ({ ...f, classId: selected })); setShowPostAnn(true); }}>+ Post</button>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {anncs.map(a => (
                <div key={a.id} style={{ padding: "16px", borderLeft: `4px solid ${a.color}`, background: a.color + "08", borderRadius: "0 12px 12px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>{a.title}</p>
                      {a.pinned && <Badge type="quiz" label="📌 Pinned" />}
                    </div>
                    <p style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(a.date)}</p>
                  </div>
                  <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.6, marginTop: 6 }}>{a.body}</p>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>Posted by {a.teacher}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      <ClassActionModals {...modalProps} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22 }}>My Classes</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>{myClasses.length} enrolled courses this semester</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {user.role === "student" && <button className="sca-btn sca-btn-ghost" onClick={() => setJoinModal(true)}>🔗 Join Class</button>}
          {user.role === "teacher" && <button className="sca-btn sca-btn-primary" onClick={() => setShowCreateClass(true)}>+ Create Class</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {myClasses.map(c => (
          <div key={c.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "transform .2s, box-shadow .2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            onClick={() => setSelected(c.id)}>
            <div style={{ height: 80, background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>{c.icon}</div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{c.name}</h3>
                <span className="sca-badge" style={{ background: c.color + "22", color: c.color, marginLeft: 8 }}>{c.code}</span>
              </div>
              <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{c.description.slice(0, 60)}…</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.textMuted, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                <span>👩‍🏫 {c.teacher.split(" ").slice(-1)}</span>
                <span>👥 {c.students} students</span>
                <span>📍 {c.room}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ClassActionModals {...modalProps} />
    </div>
  );
}

// ─── Assignments Page ─────────────────────────────────────────────────────────
function AssignmentsPage({ user, setPage }) {
  const { classes, assignments, submitAssignment, createAssignment } = useApp();
  const [filter, setFilter] = useState("all");
  const [submitModal, setSubmitModal] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [showCreateAsgn, setShowCreateAsgn] = useState(false);
  const [asgnForm, setAsgnForm] = useState({ title: "", description: "", dueDate: "", points: 100, type: "Assignment", classId: "" });
  const teacherClasses = classes.filter(c => c.teacherId === user.id);
  const relevant = assignments;
  const filtered = filter === "all" ? relevant : relevant.filter(a => a.type.toLowerCase() === filter || a.status === filter);

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Assignments</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>{relevant.length} assignments across all classes</p>
        </div>
        {user.role === "teacher" && teacherClasses.length > 0 && (
          <button className="sca-btn sca-btn-primary" onClick={() => { setAsgnForm(f => ({ ...f, classId: teacherClasses[0]?.id || "" })); setShowCreateAsgn(true); }}>+ Create Assignment</button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "project", "assignment", "quiz", "lab", "active", "graded"].map(f => (
          <button key={f} className="sca-btn" onClick={() => setFilter(f)}
            style={{ fontSize: 13, padding: "7px 14px", background: filter === f ? COLORS.indigo : "#fff", color: filter === f ? "#fff" : COLORS.textMuted, border: `1px solid ${filter === f ? COLORS.indigo : "#e2e8f0"}`, textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map(a => {
          const cls = classes.find(c => c.id === a.classId);
          const d = daysUntil(a.dueDate);
          return (
            <div key={a.id} className="sca-card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: cls?.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{cls?.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{a.title}</p>
                  <Badge type={a.type.toLowerCase()} label={a.type} />
                  <Badge type={a.submissionStatus || (a.submitted ? "submitted" : a.status)} label={user.role === "student" ? submittedBadgeLabel(a) : a.status} />
                </div>
                <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, marginBottom: 10 }}>{a.description}</p>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: COLORS.textMuted, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 500, color: cls?.color }}>📚 {cls?.name}</span>
                  <span>📅 Due {formatDate(a.dueDate)}</span>
                  <span>⭐ {a.points} pts</span>
                  {user.role === "student" && a.submitted && <span style={{ color: COLORS.emerald, fontWeight: 600 }}>Handed to teacher</span>}
                  {user.role === "student" && a.submissionFeedback && <span>Feedback: {a.submissionFeedback}</span>}
                  {user.role === "teacher" && <span>📬 {a.submissions}/{classes.find(c => c.id === a.classId)?.students} submitted</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: d < 0 ? COLORS.textMuted : d <= 3 ? "#dc2626" : d <= 7 ? "#d97706" : COLORS.emerald, marginBottom: 8 }}>
                  {d < 0 ? "Closed" : d === 0 ? "Due Today!" : `${d}d left`}
                </p>
                <button className="sca-btn sca-btn-primary" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => user.role === "student" ? setSubmitModal(a) : setPage?.("submissions")}>
                  {user.role === "student" ? (a.submitted ? "Update" : "Submit") : "Manage"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateAsgn && user.role === "teacher" && (
        <Modal title="Create Assignment / Quiz" onClose={() => setShowCreateAsgn(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Class</label>
              <select className="sca-input" value={asgnForm.classId || teacherClasses[0]?.id || ""} onChange={e => setAsgnForm(f => ({ ...f, classId: Number(e.target.value) }))}>
                {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Title *</label><input className="sca-input" value={asgnForm.title} onChange={e => setAsgnForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Description</label><textarea className="sca-input" rows={3} value={asgnForm.description} onChange={e => setAsgnForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none" }} /></div>
            <div className="sca-grid-2">
              <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Due Date *</label><input className="sca-input" type="date" value={asgnForm.dueDate} onChange={e => setAsgnForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Points</label><input className="sca-input" type="number" value={asgnForm.points} onChange={e => setAsgnForm(f => ({ ...f, points: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Type</label>
              <select className="sca-input" value={asgnForm.type} onChange={e => setAsgnForm(f => ({ ...f, type: e.target.value }))}>
                {["Assignment", "Project", "Lab", "Quiz"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowCreateAsgn(false)}>Cancel</button>
              <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => {
                if (!asgnForm.title?.trim() || !asgnForm.dueDate) return alert("Title and due date are required");
                await createAssignment({ ...asgnForm, classId: Number(asgnForm.classId || teacherClasses[0]?.id) });
                setShowCreateAsgn(false);
                setAsgnForm({ title: "", description: "", dueDate: "", points: 100, type: "Assignment", classId: teacherClasses[0]?.id || "" });
              }}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {submitModal && (
        <Modal title={`Submit — ${submitModal.title}`} onClose={() => setSubmitModal(null)}>
          <input type="file" className="sca-input" onChange={e => setSubmitFile(e.target.files?.[0] || null)} style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setSubmitModal(null)}>Cancel</button>
            <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => { await submitAssignment(submitModal.id, submitFile, submitFile?.name || "submission.zip"); setSubmitModal(null); setSubmitFile(null); }}>Submit</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Calendar Page ────────────────────────────────────────────────────────────
function CalendarPage({ user }) {
  const { events, classes, createEvent } = useApp();
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", type: "event", color: "#10b981", classId: "" });
  const teacherClasses = classes.filter(c => c.teacherId === user?.id);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsThisMonth = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const getEventsForDay = (day) => eventsThisMonth.filter(e => new Date(e.date).getDate() === day);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        {(user?.role === "teacher" || user?.role === "admin") && (
          <button className="sca-btn sca-btn-primary" onClick={() => setShowAddEvent(true)}>+ Add Event / Deadline</button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div className="sca-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 20 }}>{monthNames[month]} {year}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sca-btn sca-btn-ghost" style={{ padding: "6px 12px" }} onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>‹</button>
              <button className="sca-btn sca-btn-ghost" style={{ padding: "6px 12px" }} onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>›</button>
            </div>
          </div>

          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: COLORS.textMuted, padding: "6px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const events = getEventsForDay(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div key={i} style={{ minHeight: 72, padding: "6px 8px", borderRadius: 10, background: isToday ? "#e0e7ff" : "#f8fafc", border: `1px solid ${isToday ? COLORS.indigo : "#f1f5f9"}` }}>
                  <p style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? COLORS.indigo : COLORS.text, marginBottom: 4 }}>{day}</p>
                  {events.map(e => (
                    <div key={e.id} style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4, background: e.color + "22", color: e.color, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Events Sidebar */}
        <div>
          <div className="sca-card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Events This Month</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {eventsThisMonth.sort((a, b) => new Date(a.date) - new Date(b.date)).map(e => (
                <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 4, borderRadius: 4, background: e.color, alignSelf: "stretch", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</p>
                    <p style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(e.date)}</p>
                    <Badge type={e.type} label={e.type} />
                  </div>
                </div>
              ))}
              {eventsThisMonth.length === 0 && <p style={{ fontSize: 13, color: COLORS.textMuted }}>No events this month.</p>}
            </div>
          </div>

          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Legend</h3>
            {[{ c: COLORS.indigo, l: "Assignment" }, { c: COLORS.pink, l: "Quiz" }, { c: COLORS.emerald, l: "Event" }, { c: COLORS.amber, l: "Deadline" }].map(i => (
              <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: i.c }} />
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{i.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showAddEvent && (
        <Modal title="Add Event / Deadline" onClose={() => setShowAddEvent(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Title *</label><input className="sca-input" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Date *</label><input className="sca-input" type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Type</label>
              <select className="sca-input" value={eventForm.type} onChange={e => setEventForm(f => ({ ...f, type: e.target.value }))}>
                <option value="event">Event</option>
                <option value="deadline">Deadline</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>
            {teacherClasses.length > 0 && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Class (optional)</label>
                <select className="sca-input" value={eventForm.classId} onChange={e => setEventForm(f => ({ ...f, classId: Number(e.target.value) }))}>
                  <option value="">— None —</option>
                  {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAddEvent(false)}>Cancel</button>
              <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => {
                if (!eventForm.title?.trim() || !eventForm.date) return alert("Title and date are required");
                const colors = { event: "#10b981", deadline: "#f59e0b", quiz: "#ec4899", assignment: "#6366f1" };
                await createEvent({ title: eventForm.title, date: eventForm.date, type: eventForm.type, color: colors[eventForm.type] || "#10b981", classId: eventForm.classId || null });
                setShowAddEvent(false);
                setEventForm({ title: "", date: "", type: "event", color: "#10b981", classId: "" });
              }}>Add</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Announcements Page ───────────────────────────────────────────────────────
function AnnouncementsPage({ user }) {
  const { classes, announcements, createAnnouncement } = useApp();
  const [showPost, setShowPost] = useState(false);
  const [postForm, setPostForm] = useState({ classId: "", title: "", body: "", pinned: false });

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22 }}>Announcements</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>{announcements.length} announcements across your classes</p>
        </div>
        {user.role === "teacher" && <button className="sca-btn sca-btn-primary" onClick={() => setShowPost(true)}>+ Post Announcement</button>}
      </div>

      {/* Pinned */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>📌 Pinned</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {announcements.filter(a => a.pinned).map(a => (
            <div key={a.id} className="sca-card" style={{ borderLeft: `4px solid ${a.color}` }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Avatar name={a.teacher} color={a.color} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 16 }}>{a.title}</h3>
                    <p style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(a.date)}</p>
                  </div>
                  <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.65, marginBottom: 8 }}>{a.body}</p>
                  <p style={{ fontSize: 12, color: COLORS.textMuted }}>Posted by <strong>{a.teacher}</strong></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>All Announcements</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {announcements.filter(a => !a.pinned).map(a => (
          <div key={a.id} className="sca-card">
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Avatar name={a.teacher} color={a.color} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>{a.title}</h3>
                  <p style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(a.date)}</p>
                </div>
                <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.65, marginBottom: 8 }}>{a.body}</p>
                <p style={{ fontSize: 12, color: COLORS.textMuted }}>Posted by <strong>{a.teacher}</strong></p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showPost && (
        <Modal title="Post Announcement" onClose={() => setShowPost(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Class</label>
              <select className="sca-input" value={postForm.classId} onChange={e => setPostForm(f => ({ ...f, classId: e.target.value }))}>
                {classes.filter(c => c.teacherId === user.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Title</label><input className="sca-input" placeholder="Announcement title" value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Message</label><textarea className="sca-input" rows={4} placeholder="Write your announcement…" style={{ resize: "none" }} value={postForm.body} onChange={e => setPostForm(f => ({ ...f, body: e.target.value }))} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowPost(false)}>Cancel</button>
              <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => { await createAnnouncement({ classId: Number(postForm.classId || classes[0]?.id), title: postForm.title, body: postForm.body, pinned: postForm.pinned }); setShowPost(false); setPostForm({ classId: "", title: "", body: "", pinned: false }); }}>Post</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Submissions Page (Teacher + Student) ─────────────────────────────────────
function SubmissionsPage({ user }) {
  const { submissions, assignments, gradeSubmission, downloadSubmission } = useApp();
  const [gradeModal, setGradeModal] = useState(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [rubricScores, setRubricScores] = useState(null);

  const openGrade = (sub) => {
    setGradeModal(sub);
    setGradeScore(sub.grade != null ? String(sub.grade) : "");
    setGradeFeedback(sub.feedback || "");
  };

  if (user?.role === "student") {
    return (
      <div className="fade-in" style={{ padding: 28 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>My Submissions</h2>
        <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>
          {submissions.length} submission{submissions.length === 1 ? "" : "s"} · {submissions.filter(s => s.status === "graded").length} graded
        </p>
        {submissions.length === 0 ? (
          <EmptyState title="No submissions yet" body="Submit assignments from the Assignments page or inside a class." />
        ) : (
          <div className="sca-card">
            <table className="sca-table">
              <thead>
                <tr><th>Assignment</th><th>Submitted</th><th>File</th><th>Status</th><th>Grade</th><th>Feedback</th></tr>
              </thead>
              <tbody>
                {submissions.map(s => {
                  const a = assignments.find(item => item.id === s.assignmentId);
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{a?.title || "Assignment"}</td>
                      <td style={{ fontSize: 12, color: COLORS.textMuted }}>{s.submittedAt}</td>
                      <td>
                        {s.file ? (
                          <button type="button" className="sca-btn sca-btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => downloadSubmission(s.id, s.file)}>
                            📎 {s.file}
                          </button>
                        ) : "—"}
                      </td>
                      <td><Badge type={s.status} label={s.status} /></td>
                      <td style={{ fontSize: 14, fontWeight: 600 }}>{s.grade != null ? `${s.grade}/${a?.points}` : "—"}</td>
                      <td style={{ fontSize: 13, color: COLORS.textMuted }}>{s.feedback || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Submissions</h2>
      <p style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 24 }}>{submissions.length} submissions · {submissions.filter(s => s.status === "submitted").length} awaiting grade</p>

      {submissions.length === 0 ? (
        <EmptyState title="No submissions yet" body="Student work will appear here when assignments are submitted." />
      ) : (
      <div className="sca-card">
        <table className="sca-table">
          <thead>
            <tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>File</th><th>Status</th><th>Grade</th><th></th></tr>
          </thead>
          <tbody>
            {submissions.map(s => {
              const a = assignments.find(a => a.id === s.assignmentId);
              return (
                <tr key={s.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={s.studentName} color={COLORS.emerald} size={32} /><span style={{ fontWeight: 500, fontSize: 13 }}>{s.studentName}</span></div></td>
                  <td style={{ fontSize: 13 }}>{a?.title}</td>
                  <td style={{ fontSize: 12, color: COLORS.textMuted }}>{s.submittedAt}</td>
                  <td>
                    <button type="button" className="sca-btn sca-btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => downloadSubmission(s.id, s.file)}>
                      📎 {s.file}
                    </button>
                  </td>
                  <td><Badge type={s.status} label={s.status} /></td>
                  <td style={{ fontSize: 14, fontWeight: 600 }}>{s.grade !== null ? `${s.grade}/${a?.points}` : "—"}</td>
                  <td>
                    {s.status === "submitted" && (
                      <button type="button" className="sca-btn sca-btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => openGrade(s)}>Grade</button>
                    )}
                    {s.status === "graded" && (
                      <button type="button" className="sca-btn sca-btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => openGrade(s)}>Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {gradeModal && (
        <Modal title={`Grade — ${gradeModal.studentName}`} onClose={() => setGradeModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 13, color: COLORS.textMuted }}>Submitted file</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: COLORS.indigo }}>📎 {gradeModal.file}</p>
            </div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Score (out of {assignments.find(a => a.id === gradeModal.assignmentId)?.points})</label><input className="sca-input" type="number" placeholder="0" value={gradeScore} onChange={e => setGradeScore(e.target.value)} /></div>
            <RubricGrader assignmentId={gradeModal.assignmentId} onScoreChange={(total, scores) => { setGradeScore(String(total)); setRubricScores(scores); }} />
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Feedback</label><textarea className="sca-input" rows={4} placeholder="Write feedback for the student…" style={{ resize: "none" }} value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setGradeModal(null)}>Cancel</button>
              <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => { await gradeSubmission(gradeModal.id, Number(gradeScore), gradeFeedback, rubricScores); setGradeModal(null); setGradeScore(""); setGradeFeedback(""); setRubricScores(null); }}>Save Grade</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ user }) {
  const { updateProfile, updatePassword, setUser } = useApp();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || "", bio: user.bio || "" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const r = await updateProfile({ ...form, emailNotifications: true, darkMode: user.darkMode });
    setUser(r.user);
    setSaved(true);
    toast.success("Profile updated.");
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDarkMode = async () => {
    const r = await updateProfile({ darkMode: !user.darkMode });
    setUser(r.user);
    toast.info(r.user.darkMode ? "Dark mode enabled." : "Light mode enabled.");
  };
  const roleColors = { student: COLORS.emerald, teacher: COLORS.indigo, admin: COLORS.amber };

  return (
    <div className="fade-in" style={{ padding: 28, maxWidth: 700 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Profile Settings</h2>

      {/* Profile Card */}
      <div className="sca-card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: roleColors[user.role], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", fontWeight: 700 }}>
          {getInitials(user.name)}
        </div>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 20 }}>{user.name}</h3>
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>{user.email}</p>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <Badge type={user.role === "teacher" ? "active" : user.role === "admin" ? "quiz" : "graded"} label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
            {user.department && <Badge type="project" label={user.department} />}
            {user.major && <Badge type="project" label={user.major} />}
          </div>
        </div>
        <button className="sca-btn sca-btn-ghost" style={{ marginLeft: "auto" }}>Change Photo</button>
      </div>

      {/* Edit Form */}
      <div className="sca-card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Personal Information</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="sca-grid-2">
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Full Name</label><input className="sca-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Email</label><input className="sca-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Phone</label><input className="sca-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Bio</label><textarea className="sca-input" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ resize: "none" }} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="sca-btn sca-btn-primary" onClick={save}>{saved ? "✅ Saved!" : "Save Changes"}</button>
            <button className="sca-btn sca-btn-ghost">Discard</button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="sca-card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Security</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Current Password</label><input className="sca-input" type="password" placeholder="••••••••" /></div>
          <div className="sca-grid-2">
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>New Password</label><input className="sca-input" type="password" placeholder="••••••••" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Confirm</label><input className="sca-input" type="password" placeholder="••••••••" /></div>
          </div>
          <button className="sca-btn sca-btn-ghost" style={{ width: "fit-content" }} onClick={async () => { if (pwd.next !== pwd.confirm) return alert("Passwords do not match"); await updatePassword(pwd.current, pwd.next); setPwd({ current: "", next: "", confirm: "" }); alert("Password updated."); }}>Update Password</button>
        </div>
      </div>

      {/* Preferences */}
      <div className="sca-card">
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Preferences</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--sca-border)" }}>
          <div><p style={{ fontWeight: 500, fontSize: 14 }}>Dark Mode</p><p style={{ fontSize: 12, color: COLORS.textMuted }}>Reduce eye strain in low light</p></div>
          <button type="button" onClick={toggleDarkMode} style={{ width: 44, height: 24, borderRadius: 12, background: user.darkMode ? COLORS.indigo : "var(--sca-border)", border: "none", cursor: "pointer", position: "relative" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: user.darkMode ? 23 : 3, transition: "left .2s" }} />
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
          <div><p style={{ fontWeight: 500, fontSize: 14 }}>Email Notifications</p><p style={{ fontSize: 12, color: COLORS.textMuted }}>Receive assignment reminders</p></div>
          <button type="button" style={{ width: 44, height: 24, borderRadius: 12, background: COLORS.indigo, border: "none", cursor: "pointer", position: "relative" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 23 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Users Page (Admin) ───────────────────────────────────────────────────────
function UsersPage() {
  const { users, createUser, deleteUser } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "changeme123", role: "student" });
  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22 }}>User Management</h2>
        <button className="sca-btn sca-btn-primary" onClick={() => setShowAdd(true)}>+ Add User</button>
      </div>
      <div className="sca-card">
        <table className="sca-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department/Major</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={u.name} color={u.role === "teacher" ? COLORS.indigo : u.role === "admin" ? COLORS.amber : COLORS.emerald} size={32} /><span style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</span></div></td>
                <td style={{ fontSize: 13, color: COLORS.textMuted }}>{u.email}</td>
                <td><Badge type={u.role === "teacher" ? "active" : u.role === "admin" ? "quiz" : "graded"} label={u.role} /></td>
                <td style={{ fontSize: 13, color: COLORS.textMuted }}>{u.department || u.major || "—"}</td>
                <td><span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>● Active</span></td>
                <td><div style={{ display: "flex", gap: 6 }}><button className="sca-btn sca-btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }}>Edit</button><button className="sca-btn sca-btn-danger" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => deleteUser(u.id)}>Remove</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Full Name *</label><input className="sca-input" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Email *</label><input className="sca-input" type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} /></div>
            <div><label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Password</label><input className="sca-input" type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} /></div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block" }}>Role</label>
              <select className="sca-input" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sca-btn sca-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="sca-btn sca-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => {
                if (!newUser.name?.trim() || !newUser.email?.trim()) return alert("Name and email are required");
                await createUser(newUser);
                setShowAdd(false);
                setNewUser({ name: "", email: "", password: "changeme123", role: "student" });
              }}>Create User</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reports Page (Admin) ─────────────────────────────────────────────────────
function ReportsPage() {
  const { classes, assignments, submissions, users } = useApp();
  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Reports & Analytics</h2>
      <div className="sca-grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Total Students" value={users.filter(u => u.role === "student").length} icon="👨‍🎓" color={COLORS.emerald} />
        <StatCard label="Total Teachers" value={users.filter(u => u.role === "teacher").length} icon="👩‍🏫" color={COLORS.indigo} />
        <StatCard label="Assignments Posted" value={assignments.length} icon="📝" color={COLORS.amber} />
        <StatCard label="Total Submissions" value={submissions.length} icon="📬" color={COLORS.pink} />
      </div>
      <div className="sca-grid-2">
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Class Enrollment</h3>
          {classes.map(c => (
            <div key={c.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span style={{ color: COLORS.textMuted }}>{c.students} students</span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 8 }}>
                <div style={{ height: "100%", borderRadius: 8, background: c.color, width: `${(c.students / 50) * 100}%`, transition: "width .4s" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Assignment Distribution</h3>
          {["Project", "Assignment", "Quiz", "Lab"].map(t => {
            const count = assignments.filter(a => a.type === t).length;
            const pct = assignments.length ? Math.round((count / assignments.length) * 100) : 0;
            const colors = { Project: COLORS.indigo, Assignment: COLORS.emerald, Quiz: COLORS.pink, Lab: COLORS.amber };
            return (
              <div key={t} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{t}</span><span style={{ color: COLORS.textMuted }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: "#f1f5f9", borderRadius: 8 }}>
                  <div style={{ height: "100%", borderRadius: 8, background: colors[t], width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Page (Admin) ────────────────────────────────────────────────────
function SettingsPage() {
  const { settings, updateSettings, resetData } = useApp();
  const toast = useToast();
  const [form, setForm] = useState({
    institution_name: settings.institution_name || "SmartClass University",
    academic_year: settings.academic_year || "2024–2025",
    max_class_size: settings.max_class_size || "50",
  });
  const fields = [
    { key: "institution_name", title: "Institution Name", sub: "Change the institution name", type: "text" },
    { key: "academic_year", title: "Academic Year", sub: "Current academic year", type: "text" },
    { key: "max_class_size", title: "Max Class Size", sub: "Default max students per class", type: "number" },
  ];
  return (
    <div className="fade-in" style={{ padding: 28, maxWidth: 600 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 24 }}>System Settings</h2>
      {fields.map((s) => (
        <div key={s.key} className="sca-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><p style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</p><p style={{ fontSize: 13, color: COLORS.textMuted }}>{s.sub}</p></div>
            <input className="sca-input" type={s.type} value={form[s.key]} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))} style={{ width: 200 }} />
          </div>
        </div>
      ))}
      <div className="sca-card" style={{ marginBottom: 14 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Danger Zone</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="sca-btn sca-btn-danger" onClick={() => resetData()}>Reset All Data</button>
          <button className="sca-btn sca-btn-danger" onClick={() => alert("Archive is disabled in this demo.")}>Archive System</button>
        </div>
      </div>
      <button type="button" className="sca-btn sca-btn-primary" onClick={async () => { await updateSettings(form); toast.success("Settings saved."); }}>Save Settings</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("landing");
  const { user, logout, notifications, loading, error, updateProfile, setUser, mergeNotifications, refresh } = useApp();
  const [page, setPage] = useState("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  useTheme(user);

  useEffect(() => {
    if (user && !user.onboardingComplete) setShowOnboarding(true);
  }, [user?.id, user?.onboardingComplete]);

  const handleAuth = () => { setView("app"); setPage("dashboard"); };
  const handleLogout = () => { logout(); setView("landing"); setPage("dashboard"); };

  useNotificationStream((data) => {
    if (data?.notifications?.length) mergeNotifications(data.notifications);
    if (data?.unread != null) refresh();
  });

  const toggleTheme = async () => {
    if (!user) return;
    const order = ['system', 'light', 'dark'];
    const current = user.themePreference || (user.darkMode ? 'dark' : 'light');
    const next = order[(order.indexOf(current) + 1) % order.length];
    const r = await updateProfile({
      themePreference: next,
      darkMode: next === 'dark' ? true : next === 'light' ? false : resolveDarkMode({ ...user, themePreference: next }),
    });
    setUser(r.user);
  };

  const pageTitle = {
    dashboard: "Dashboard", classes: "Classes", assignments: "Assignments", attendance: "Attendance",
    submissions: "Submissions", gradebook: "Gradebook", analytics: "Analytics", discussions: "Discussions",
    ai: user?.role === "student" ? "AI Coach" : "AI Studio", calendar: "Calendar", announcements: "Announcements",
    messages: "Messages", parent: "Parent Portal",
    profile: "Profile", users: "Users", reports: "Reports", settings: "Settings",
  };
  const unreadNotifs = notifications.filter(n => !n.read).length;

  if (loading && getToken() && !user) {
    return (
      <div className="sca-root sca-loading-screen">
        <div className="sca-spinner" />
        <p>Loading your workspace…</p>
      </div>
    );
  }
  if (!user && view === "landing") return <div className="sca-root"><LandingPage onLogin={() => setView("auth")} /></div>;
  if (!user && view === "auth") return <div className="sca-root"><AuthPage onAuth={handleAuth} /></div>;
  if (!user) return null;

  const renderPage = () => {
    if (page === "dashboard") {
      if (user.role === "parent") return <ParentPortalPage user={user} />;
      if (user.role === "student") return <StudentDashboard user={user} setPage={setPage} />;
      if (user.role === "teacher") return <TeacherDashboard user={user} setPage={setPage} />;
      return <AdminDashboard />;
    }
    if (page === "classes") return <ClassesPage user={user} setPage={setPage} />;
    if (page === "assignments") return <AssignmentsPage user={user} setPage={setPage} />;
    if (page === "attendance") return <AttendancePage user={user} />;
    if (page === "gradebook") return <GradebookPage user={user} />;
    if (page === "analytics") return <AnalyticsPage user={user} />;
    if (page === "discussions") return <DiscussionsPage user={user} />;
    if (page === "ai") return <AIPage user={user} />;
    if (page === "submissions") return <SubmissionsPage user={user} />;
    if (page === "calendar") return <AcademicCalendarPage user={user} />;
    if (page === "messages") return <MessagesPage user={user} />;
    if (page === "parent") return <ParentPortalPage user={user} />;
    if (page === "announcements") return <AnnouncementsPage user={user} />;
    if (page === "profile") return <ProfilePage user={user} />;
    if (page === "users") return <UsersPage />;
    if (page === "reports") return <ReportsPage />;
    if (page === "settings") return <SettingsPage />;
  };

  return (
    <div className="sca-root">
      {showOnboarding && <Onboarding user={user} onComplete={() => setShowOnboarding(false)} />}
      {mobileNav && <div className="sca-sidebar-backdrop" onClick={() => setMobileNav(false)} aria-hidden="true" />}
      {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 28px", fontSize: 13 }}>{error}</div>}
      <Sidebar user={user} page={page} setPage={setPage} onLogout={handleLogout} mobileOpen={mobileNav} onCloseMobile={() => setMobileNav(false)} />
      <div className="sca-main">
        <Topbar title={pageTitle[page] || "SmartClass"} user={user} notifCount={unreadNotifs} onToggleTheme={toggleTheme} onMenuClick={() => setMobileNav(true)} />
        {error && <div className="sca-alert" role="alert">{error}</div>}
        <main>{renderPage()}</main>
      </div>
    </div>
  );
}
