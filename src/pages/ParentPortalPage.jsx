import { useEffect, useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';
import { PageShell } from '../components/PageShell.jsx';
import { BarChart } from '../components/charts/BarChart.jsx';

const COLORS = { indigo: '#6366f1', textMuted: '#64748b', emerald: '#10b981' };

export function ParentPortalPage({ user }) {
  const { linkedStudents: bootStudents } = useApp();
  const [students, setStudents] = useState(bootStudents || []);
  const [selectedId, setSelectedId] = useState(bootStudents?.[0]?.id || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkEmail, setLinkEmail] = useState('');

  useEffect(() => {
    api.getParentStudents().then((r) => {
      setStudents(r.students || []);
      if (!selectedId && r.students?.[0]) setSelectedId(r.students[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) { setLoading(false); return; }
    setLoading(true);
    api.getParentDashboard(selectedId).then(setData).finally(() => setLoading(false));
  }, [selectedId]);

  const linkStudent = async () => {
    await api.linkParentStudent(linkEmail);
    const r = await api.getParentStudents();
    setStudents(r.students || []);
    setLinkEmail('');
  };

  if (!students.length) {
    return (
      <PageShell title="Parent Portal" subtitle={`Welcome, ${user.name.split(' ')[0]}`}>
        <div className="sca-card sca-empty">
          <p>No students linked yet.</p>
          <div className="sca-mt" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="sca-input" placeholder="Student school email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} aria-label="Student email" />
            <button type="button" className="sca-btn sca-btn-primary" onClick={linkStudent}>Link student</button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Parent Portal"
      subtitle="View-only access to your child's academic progress"
      actions={(
        <select className="sca-input" value={selectedId || ''} onChange={(e) => setSelectedId(Number(e.target.value))} aria-label="Select student">
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    >
      {loading ? <div className="sca-spinner" style={{ margin: '40px auto' }} /> : !data ? (
        <div className="sca-empty">Unable to load dashboard.</div>
      ) : (
        <>
          <div className="sca-grid-4 sca-mb">
            <div className="sca-stat-card"><p className="sca-muted">Avg grade</p><p style={{ fontSize: 28, fontWeight: 700 }}>{data.stats.avgGrade != null ? `${data.stats.avgGrade}%` : '—'}</p></div>
            <div className="sca-stat-card"><p className="sca-muted">Attendance</p><p style={{ fontSize: 28, fontWeight: 700 }}>{data.stats.attendanceRate != null ? `${data.stats.attendanceRate}%` : '—'}</p></div>
            <div className="sca-stat-card"><p className="sca-muted">Missing work</p><p style={{ fontSize: 28, fontWeight: 700 }}>{data.stats.missing}</p></div>
            <div className="sca-stat-card"><p className="sca-muted">Risk level</p><p style={{ fontSize: 28, fontWeight: 700, textTransform: 'capitalize' }}>{data.prediction?.level || '—'}</p></div>
          </div>

          <div className="sca-grid-2 sca-mb">
            <div className="sca-card">
              <h3 className="sca-section-title">Grade overview</h3>
              {data.grades.length ? (
                <BarChart data={data.grades.slice(0, 8).map((g) => ({ label: g.assignment.slice(0, 12), value: g.percent }))} color={COLORS.indigo} />
              ) : <p className="sca-muted">No graded work yet.</p>}
            </div>
            <div className="sca-card">
              <h3 className="sca-section-title">AI performance insight</h3>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>{data.prediction?.prediction}</p>
              <ul className="sca-onboarding__list">
                {(data.prediction?.reasoning || []).map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          </div>

          <div className="sca-grid-2">
            <div className="sca-card">
              <h3 className="sca-section-title">Upcoming deadlines</h3>
              {!data.deadlines?.length ? <p className="sca-muted">No upcoming deadlines.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {data.deadlines.map((d) => (
                    <li key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sca-border)' }}>
                      <strong>{d.title}</strong>
                      <p className="sca-muted" style={{ fontSize: 13 }}>{d.className} · Due {d.dueDate}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="sca-card">
              <h3 className="sca-section-title">Teacher feedback</h3>
              {data.grades.filter((g) => g.feedback).length ? data.grades.filter((g) => g.feedback).slice(0, 5).map((g) => (
                <div key={g.assignment} className="sca-reply">
                  <strong style={{ fontSize: 13 }}>{g.assignment}</strong>
                  <p>{g.feedback}</p>
                </div>
              )) : <p className="sca-muted">No feedback yet.</p>}
            </div>
          </div>

          <div className="sca-card sca-mt">
            <h3 className="sca-section-title">School announcements</h3>
            {data.announcements?.slice(0, 5).map((a) => (
              <div key={a.id} className="sca-reply">
                <strong>{a.title}</strong>
                <p className="sca-muted" style={{ fontSize: 12 }}>{a.className} · {a.date}</p>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
