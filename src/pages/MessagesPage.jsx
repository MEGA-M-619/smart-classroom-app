import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';
import { PageShell } from '../components/PageShell.jsx';

export function MessagesPage({ user }) {
  const { users, classes, sendMessage } = useApp();
  const [threads, setThreads] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const bottomRef = useRef(null);

  const loadThreads = () => api.getMessageThreads().then((r) => setThreads(r.threads || []));

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!activePeer) return;
    api.getMessageThread(activePeer).then((r) => setMessages(r.messages || []));
  }, [activePeer]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const peers = users.filter((u) => u.id !== user.id && ['student', 'teacher', 'parent'].includes(u.role));

  const handleSend = async () => {
    if (!draft.trim() || !activePeer) return;
    await sendMessage({ recipientId: activePeer, body: draft.trim() });
    setDraft('');
    const r = await api.getMessageThread(activePeer);
    setMessages(r.messages || []);
    loadThreads();
  };

  const doSearch = async () => {
    if (!search.trim()) return setSearchResults([]);
    const r = await api.searchMessages(search.trim());
    setSearchResults(r.results || []);
  };

  return (
    <PageShell title="Messages" subtitle="Private conversations with teachers, students, and parents">
      <div className="sca-messages">
        <aside className="sca-messages__sidebar" aria-label="Conversations">
          <input className="sca-input sca-mb-sm" placeholder="Search messages…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} aria-label="Search messages" />
          {searchResults.length > 0 && (
            <div className="sca-mb">
              {searchResults.map((r) => (
                <button key={r.id} type="button" className="sca-thread" onClick={() => { setActivePeer(r.peerId); setSearchResults([]); }}>
                  <strong style={{ fontSize: 13 }}>{r.body.slice(0, 60)}</strong>
                </button>
              ))}
            </div>
          )}
          {threads.map((t) => (
            <button key={t.peerId} type="button" className={`sca-thread${activePeer === t.peerId ? ' active' : ''}`} onClick={() => setActivePeer(t.peerId)}>
              <strong>{t.peerName}</strong>
              <span>{t.lastMessage?.slice(0, 50)}</span>
              {t.unread > 0 && <span className="sca-badge">{t.unread}</span>}
            </button>
          ))}
          {user.role !== 'student' && (
            <div className="sca-mt">
              <p className="sca-field-label">New conversation</p>
              <select className="sca-input" onChange={(e) => setActivePeer(Number(e.target.value))} defaultValue="">
                <option value="" disabled>Select contact</option>
                {peers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
              </select>
            </div>
          )}
        </aside>
        <section className="sca-messages__panel" aria-label="Message thread">
          {!activePeer ? (
            <div className="sca-empty">Select a conversation to start messaging.</div>
          ) : (
            <>
              <div className="sca-messages__list">
                {messages.map((m) => (
                  <div key={m.id} className={`sca-msg${m.mine ? ' sca-msg--mine' : ''}`}>
                    <p>{m.body}</p>
                    <span className="sca-muted" style={{ fontSize: 11 }}>{m.read ? 'Read' : ''}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="sca-messages__composer">
                <textarea className="sca-input" rows={2} placeholder="Write a message…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Message body" />
                <button type="button" className="sca-btn sca-btn-primary" onClick={handleSend}>Send</button>
              </div>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
