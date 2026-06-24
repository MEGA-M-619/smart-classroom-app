import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function RubricGrader({ assignmentId, onScoreChange }) {
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (!assignmentId) return;
    api.getAssignmentRubric(assignmentId).then((d) => {
      setCriteria(d.rubric?.criteria || []);
      setScores({});
    }).catch(() => setCriteria([]));
  }, [assignmentId]);

  useEffect(() => {
    if (!criteria.length) return;
    const rubricScores = criteria.map((c, i) => ({
      name: c.name,
      maxPoints: c.maxPoints,
      score: Number(scores[i]) || 0,
    }));
    const total = rubricScores.reduce((s, r) => s + r.score, 0);
    onScoreChange?.(total, rubricScores);
  }, [scores, criteria, onScoreChange]);

  if (!criteria.length) return null;

  return (
    <div className="sca-rubric">
      <p className="sca-field-label">Rubric grading</p>
      {criteria.map((c, i) => (
        <div key={c.name} className="sca-rubric__row">
          <div>
            <strong style={{ fontSize: 13 }}>{c.name}</strong>
            <p className="sca-muted" style={{ fontSize: 12 }}>{c.description}</p>
          </div>
          <input
            className="sca-input sca-rubric__score"
            type="number"
            min={0}
            max={c.maxPoints}
            aria-label={`Score for ${c.name}`}
            value={scores[i] ?? ''}
            onChange={(e) => setScores((s) => ({ ...s, [i]: e.target.value }))}
          />
          <span className="sca-muted" style={{ fontSize: 12 }}>/ {c.maxPoints}</span>
        </div>
      ))}
    </div>
  );
}
