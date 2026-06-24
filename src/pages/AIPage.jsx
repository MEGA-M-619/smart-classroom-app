import { useState } from 'react';
import { api } from '../api.js';

const GENERATORS = [
  { id: 'lesson-plan', label: 'Lesson plan', icon: '📋' },
  { id: 'quiz', label: 'Quiz generator', icon: '❓' },
  { id: 'assignment', label: 'Assignment', icon: '📝' },
  { id: 'feedback', label: 'Feedback assistant', icon: '💬' },
  { id: 'study-plan', label: 'Study plan', icon: '🎯' },
  { id: 'insights', label: 'Class insights', icon: '📊' },
];

export function AIPage({ user }) {
  const [type, setType] = useState('lesson-plan');
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await api.generateAI({ type, topic: topic || 'Introduction to the subject' });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  const allowed = user.role === 'teacher' || user.role === 'admin' || user.role === 'student';
  const types = user.role === 'student'
    ? GENERATORS.filter((g) => ['study-plan', 'feedback'].includes(g.id))
    : GENERATORS;

  return (
    <div className="sca-page fade-in">
      <header className="sca-page-header">
        <h2>AI Studio</h2>
        <p>SmartClass differentiator — structured AI for planning, assessment, and coaching.</p>
      </header>

      {!allowed ? (
        <div className="sca-empty">AI Studio is not available for your role.</div>
      ) : (
        <div className="sca-grid-2">
          <div className="sca-card">
            <h3 className="sca-section-title">Generator</h3>
            <div className="sca-ai-grid">
              {types.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`sca-ai-tile ${type === g.id ? 'active' : ''}`}
                  onClick={() => setType(g.id)}
                >
                  <span>{g.icon}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
            <label className="sca-field-label">Topic / focus</label>
            <input className="sca-input" placeholder="e.g. Binary search trees" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <button type="button" className="sca-btn sca-btn-primary sca-mt" style={{ width: '100%' }} onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          <div className="sca-card">
            <h3 className="sca-section-title">{result?.title || 'Output'}</h3>
            {result ? (
              <pre className="sca-ai-output">{result.content}</pre>
            ) : (
              <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>Pick a generator and click Generate.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
