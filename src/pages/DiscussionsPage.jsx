import { useEffect, useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';

export function DiscussionsPage({ user }) {
  const { classes } = useApp();
  const myClasses = user.role === 'teacher'
    ? classes.filter((c) => c.teacherId === user.id)
    : classes;
  const [classId, setClassId] = useState(myClasses[0]?.id || '');
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [form, setForm] = useState({ title: '', body: '' });
  const [reply, setReply] = useState('');

  const load = () => {
    if (!classId) return;
    api.getDiscussions(classId).then((r) => setThreads(r.threads || []));
  };

  useEffect(() => { load(); }, [classId]);

  useEffect(() => {
    if (!selected) return;
    api.getDiscussionReplies(selected).then((r) => setReplies(r.replies || []));
  }, [selected]);

  const createThread = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    await api.createDiscussion({ classId, title: form.title, body: form.body });
    setForm({ title: '', body: '' });
    load();
  };

  const postReply = async () => {
    if (!reply.trim() || !selected) return;
    await api.replyDiscussion(selected, reply);
    setReply('');
    const r = await api.getDiscussionReplies(selected);
    setReplies(r.replies || []);
  };

  return (
    <div className="sca-page fade-in">
      <header className="sca-page-header sca-page-header--row">
        <div>
          <h2>Discussions</h2>
          <p>Async classroom boards — no external forum needed.</p>
        </div>
        <select className="sca-input" value={classId} onChange={(e) => setClassId(Number(e.target.value))} style={{ maxWidth: 220 }}>
          {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </header>

      <div className="sca-grid-2">
        <div className="sca-card">
          <h3 className="sca-section-title">Threads</h3>
          {threads.length === 0 && <div className="sca-empty">Start the first discussion.</div>}
          {threads.map((t) => (
            <button key={t.id} type="button" className={`sca-thread ${selected === t.id ? 'active' : ''}`} onClick={() => setSelected(t.id)}>
              <strong>{t.title}</strong>
              <span>{t.replyCount} replies · {t.authorName}</span>
            </button>
          ))}
          <div className="sca-mt">
            <input className="sca-input sca-mb-sm" placeholder="Thread title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <textarea className="sca-input" rows={3} placeholder="Start a discussion…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            <button type="button" className="sca-btn sca-btn-primary sca-mt" onClick={createThread}>Post thread</button>
          </div>
        </div>
        <div className="sca-card">
          <h3 className="sca-section-title">Conversation</h3>
          {!selected ? <p style={{ color: 'var(--sca-text-muted)', fontSize: 14 }}>Select a thread.</p> : (
            <>
              {replies.map((r) => (
                <div key={r.id} className="sca-reply">
                  <strong>{r.authorName}</strong>
                  <p>{r.body}</p>
                </div>
              ))}
              <textarea className="sca-input" rows={2} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button type="button" className="sca-btn sca-btn-primary sca-mt" onClick={postReply}>Reply</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
