import { useEffect, useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';

export function GradebookPage({ user }) {
  const { classes } = useApp();
  const teacherClasses = classes.filter((c) => c.teacherId === user.id);
  const [classId, setClassId] = useState(teacherClasses[0]?.id || '');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    api.getGradebook(classId).then(setBook).finally(() => setLoading(false));
  }, [classId]);

  const exportCsv = () => {
    if (!classId) return;
    api.exportGradebook(classId);
  };

  return (
    <div className="sca-page fade-in">
      <header className="sca-page-header sca-page-header--row">
        <div>
          <h2>Gradebook</h2>
          <p>Central view of every student grade across assignments.</p>
        </div>
        <div className="sca-page-header__actions">
          <select className="sca-input" value={classId} onChange={(e) => setClassId(Number(e.target.value))} style={{ maxWidth: 240 }}>
            {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" className="sca-btn sca-btn-primary" onClick={exportCsv} disabled={!classId}>Export CSV</button>
        </div>
      </header>

      {loading && <div className="sca-spinner" style={{ margin: '32px auto' }} />}
      {!loading && book && (
        <div className="sca-card sca-table-scroll">
          <table className="sca-table">
            <thead>
              <tr>
                <th>Student</th>
                {book.assignments.map((a) => <th key={a.id}>{a.title}</th>)}
                <th>Avg</th>
              </tr>
            </thead>
            <tbody>
              {book.rows.map((row) => (
                <tr key={row.studentId}>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  {row.grades.map((g) => (
                    <td key={g.assignmentId}>{g.grade != null ? g.grade : <span className="sca-muted">—</span>}</td>
                  ))}
                  <td>{row.average != null ? row.average.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !book?.rows?.length && <div className="sca-empty">No students or assignments in this class yet.</div>}
    </div>
  );
}
