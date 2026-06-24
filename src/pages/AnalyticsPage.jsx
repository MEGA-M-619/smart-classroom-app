import { useEffect, useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';
import { BarChart } from '../components/charts/BarChart.jsx';

const COLORS = { indigo: '#6366f1', textMuted: '#64748b' };

function PageShell({ title, subtitle, children }) {
  return (
    <div className="sca-page fade-in">
      <header className="sca-page-header">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </div>
  );
}

export function AnalyticsPage({ user }) {
  const { classes } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const teacherClasses = classes.filter((c) => c.teacherId === user.id);

  useEffect(() => {
    api.getTeacherAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell title="Analytics">
        <div className="sca-spinner" style={{ margin: '40px auto' }} />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell title="Analytics">
        <div className="sca-empty">No analytics yet. Create classes and assignments to see insights.</div>
      </PageShell>
    );
  }

  const avgCompletion = data.completionRates?.length
    ? Math.round(data.completionRates.reduce((s, c) => s + c.rate, 0) / data.completionRates.length)
    : 0;

  return (
    <PageShell title="Classroom Analytics" subtitle="Smart Pulse — performance and at-risk insights">
      <div className="sca-grid-3 sca-mb">
        <div className="sca-stat-card"><p style={{ fontSize: 13, color: COLORS.textMuted }}>Classes</p><p style={{ fontSize: 28, fontWeight: 700 }}>{teacherClasses.length}</p></div>
        <div className="sca-stat-card"><p style={{ fontSize: 13, color: COLORS.textMuted }}>High risk</p><p style={{ fontSize: 28, fontWeight: 700 }}>{data.atRisk?.filter((s) => s.level === 'high').length || 0}</p></div>
        <div className="sca-stat-card"><p style={{ fontSize: 13, color: COLORS.textMuted }}>Avg completion</p><p style={{ fontSize: 28, fontWeight: 700 }}>{avgCompletion}%</p></div>
      </div>

      <div className="sca-grid-2 sca-mb">
        <div className="sca-card">
          <h3 className="sca-section-title">Completion by class</h3>
          <BarChart data={(data.completionRates || []).map((c) => ({ label: c.className?.slice(0, 10), value: c.rate }))} color={COLORS.indigo} />
        </div>
        <div className="sca-card">
          <h3 className="sca-section-title">Submissions (14 days)</h3>
          <BarChart data={(data.weeklySubmissions || []).map((d) => ({ label: d.day?.slice(5), value: d.count }))} color="#10b981" />
        </div>
      </div>

      <div className="sca-card">
        <h3 className="sca-section-title">Students needing support</h3>
        {!data.atRisk?.length ? (
          <p style={{ color: COLORS.textMuted, fontSize: 14 }}>No at-risk signals. Great work!</p>
        ) : (
          <table className="sca-table">
            <thead><tr><th>Student</th><th>Class</th><th>Absences</th><th>Missing work</th><th>Risk</th></tr></thead>
            <tbody>
              {data.atRisk.map((s) => (
                <tr key={`${s.studentId}-${s.classId}`}>
                  <td>{s.name}</td><td>{s.className}</td><td>{s.absences}</td><td>{s.missingAssignments}</td>
                  <td><span className={`sca-risk sca-risk-${s.level}`}>{s.level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
