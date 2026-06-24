import { useEffect, useState } from 'react';
import { useApp } from '../app-context.js';
import { useToast } from '../components/Toast.jsx';
import { COLORS } from '../theme.js';
function Avatar({ name, color = COLORS.indigo, size = 36 }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="sca-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

function Badge({ type, label }) {
  return <span className={`sca-badge sca-tag-${type}`}>{label}</span>;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AttendancePage({ user }) {
  const {
    classes,
    attendanceSummary,
    attendanceRecent,
    getClassAttendance,
    saveClassAttendance,
  } = useApp();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const teacherClasses = user.role === 'teacher' || user.role === 'admin' ? classes : [];
  const [selectedClassId, setSelectedClassId] = useState(teacherClasses[0]?.id || classes[0]?.id || '');
  const [sessionDate, setSessionDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user.role !== 'teacher' && user.role !== 'admin') return undefined;
    if (!selectedClassId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getClassAttendance(selectedClassId, sessionDate)
      .then((data) => {
        setRecords(data.records || []);
        setHistory(data.history || []);
      })
      .catch((e) => toast.error(e.message || 'Could not load attendance.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, sessionDate, user.role]);

  const updateStatus = (studentId, status) => {
    setRecords((items) => items.map((item) => (
      item.studentId === studentId ? { ...item, status } : item
    )));
  };

  const save = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      const data = await saveClassAttendance(selectedClassId, sessionDate, records);
      setRecords(data.records || []);
      toast.success('Attendance saved.');
    } catch (e) {
      toast.error(e.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (user.role === 'student') {
    const overall = attendanceSummary?.length
      ? Math.round(attendanceSummary.reduce((sum, row) => sum + (row.percentage || 0), 0) / attendanceSummary.length)
      : null;

    return (
      <div className="fade-in" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 22 }}>Attendance</h2>
          <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>Track your presence across enrolled classes</p>
        </div>

        <div className="sca-grid-3" style={{ marginBottom: 24 }}>
          <div className="sca-stat-card">
            <p style={{ fontSize: 13, color: 'var(--sca-text-muted)' }}>Overall Attendance</p>
            <p style={{ fontSize: 32, fontWeight: 700 }}>{overall != null ? `${overall}%` : '—'}</p>
          </div>
          <div className="sca-stat-card">
            <p style={{ fontSize: 13, color: 'var(--sca-text-muted)' }}>Classes Tracked</p>
            <p style={{ fontSize: 32, fontWeight: 700 }}>{attendanceSummary?.length || 0}</p>
          </div>
          <div className="sca-stat-card">
            <p style={{ fontSize: 13, color: 'var(--sca-text-muted)' }}>Recent Records</p>
            <p style={{ fontSize: 32, fontWeight: 700 }}>{attendanceRecent?.length || 0}</p>
          </div>
        </div>

        <div className="sca-grid-2" style={{ marginBottom: 20 }}>
          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>By Class</h3>
            {!attendanceSummary?.length ? (
              <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>No attendance records yet.</p>
            ) : (
              attendanceSummary.map((row) => (
                <div key={row.classId} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{row.className}</span>
                    <span style={{ color: 'var(--sca-text-muted)' }}>{row.percentage ?? 0}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--sca-surface-muted)', borderRadius: 8 }}>
                    <div style={{ height: '100%', width: `${row.percentage || 0}%`, background: row.color || COLORS.indigo, borderRadius: 8 }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--sca-text-muted)', marginTop: 4 }}>
                    {row.presentCount}/{row.totalSessions} sessions · {row.absentCount} absences
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="sca-card">
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Analytics</h3>
            {!attendanceRecent?.length ? (
              <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>Attendance analytics will appear after sessions are recorded.</p>
            ) : (
              (attendanceRecent || []).slice(0, 8).map((row) => {
                const isPresent = row.status === 'present' || row.status === 'late';
                return (
                  <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 84, fontSize: 12, color: 'var(--sca-text-muted)' }}>{formatDate(row.date)}</div>
                    <div style={{ flex: 1, height: 8, background: 'var(--sca-surface-muted)', borderRadius: 8 }}>
                      <div style={{ width: isPresent ? '100%' : '18%', height: '100%', background: isPresent ? COLORS.emerald : COLORS.amber, borderRadius: 8 }} />
                    </div>
                    <Badge type={row.status} label={row.status} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Recent Records</h3>
          <table className="sca-table">
            <thead><tr><th>Date</th><th>Class</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {(attendanceRecent || []).map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.className}</td>
                  <td><Badge type={row.status} label={row.status} /></td>
                  <td style={{ color: 'var(--sca-text-muted)' }}>{row.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22 }}>Mark Attendance</h2>
          <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>Record daily presence for your classes</p>
        </div>
        <button type="button" className="sca-btn sca-btn-primary" onClick={save} disabled={saving || !selectedClassId}>
          {saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>

      <div className="sca-card" style={{ marginBottom: 20 }}>
        <div className="sca-grid-3">
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Class</label>
            <select className="sca-input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Session Date</label>
            <input className="sca-input" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>Students Present</label>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
              {records.filter((r) => r.status === 'present' || r.status === 'late').length}/{records.length}
            </p>
          </div>
        </div>
      </div>

      <div className="sca-grid-2">
        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Roster</h3>
          {loading ? <p style={{ color: 'var(--sca-text-muted)' }}>Loading roster…</p> : (
            <table className="sca-table">
              <thead><tr><th>Student</th><th>Status</th></tr></thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.studentId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={row.studentName} color={COLORS.emerald} size={32} />
                        <span style={{ fontWeight: 500 }}>{row.studentName}</span>
                      </div>
                    </td>
                    <td>
                      <select className="sca-input" style={{ width: 140 }} value={row.status} onChange={(e) => updateStatus(row.studentId, e.target.value)}>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="sca-card">
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Attendance History</h3>
          {history.length === 0 ? (
            <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>No sessions recorded yet.</p>
          ) : (
            history.map((row) => (
              <div key={row.date} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{formatDate(row.date)}</span>
                  <span style={{ color: 'var(--sca-text-muted)' }}>{row.presentCount}/{row.total} present</span>
                </div>
                <div style={{ height: 8, background: 'var(--sca-surface-muted)', borderRadius: 8 }}>
                  <div style={{ height: '100%', width: `${row.percentage}%`, background: COLORS.indigo, borderRadius: 8 }} />
                </div>
              </div>
            ))
          )}
          {history.length > 0 && (
            <p style={{ marginTop: 18, color: 'var(--sca-text-muted)', fontSize: 13 }}>
              Average attendance: {Math.round(history.reduce((sum, row) => sum + row.percentage, 0) / history.length)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
