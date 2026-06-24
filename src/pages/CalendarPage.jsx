import { useMemo, useState } from 'react';
import { useApp } from '../app-context.js';
import { api } from '../api.js';
import { PageShell } from '../components/PageShell.jsx';
import { Modal } from '../ui.jsx';

const COLORS = { indigo: '#6366f1', textMuted: '#64748b' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AcademicCalendarPage({ user }) {
  const { events, classes, createEvent, refresh } = useApp();
  const today = new Date();
  const [view, setView] = useState('month');
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [form, setForm] = useState({ title: '', date: '', type: 'event', color: '#10b981', classId: '' });
  const teacherClasses = classes.filter((c) => c.teacherId === user?.id);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const monthEvents = filtered.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventsForDate = (iso) => filtered.filter((e) => e.date === iso);

  const dropOnDate = async (dateStr) => {
    if (!dragId || !dateStr) return;
    await api.updateEvent(dragId, { date: dateStr });
    setDragId(null);
    await refresh();
  };

  const exportIcs = () => api.exportCalendar();
  const importJson = async (file) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    await api.importCalendar(parsed.events || parsed);
    await refresh();
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <PageShell
      title="Academic Calendar"
      subtitle="Assignments, exams, events, and attendance"
      actions={(
        <>
          <select className="sca-input" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter events">
            <option value="all">All types</option>
            <option value="assignment">Assignments</option>
            <option value="deadline">Deadlines</option>
            <option value="quiz">Quizzes</option>
            <option value="event">Events</option>
          </select>
          <button type="button" className="sca-btn sca-btn-ghost" onClick={exportIcs}>Export .ics</button>
          <label className="sca-btn sca-btn-ghost" style={{ cursor: 'pointer' }}>
            Import
            <input type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <button type="button" className="sca-btn sca-btn-primary" onClick={() => setShowAdd(true)}>+ Add event</button>
          )}
        </>
      )}
    >
      <div className="sca-calendar-tabs sca-mb">
        <button type="button" className={`sca-btn${view === 'month' ? ' sca-btn-primary' : ' sca-btn-ghost'}`} onClick={() => setView('month')}>Month</button>
        <button type="button" className={`sca-btn${view === 'week' ? ' sca-btn-primary' : ' sca-btn-ghost'}`} onClick={() => setView('week')}>Week</button>
      </div>

      {view === 'month' ? (
        <div className="sca-grid-2 sca-calendar-layout">
          <div className="sca-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>{MONTHS[month]} {year}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="sca-btn sca-btn-ghost" onClick={() => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }} aria-label="Previous month">‹</button>
                <button type="button" className="sca-btn sca-btn-ghost" onClick={() => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }} aria-label="Next month">›</button>
              </div>
            </div>
            <div className="sca-calendar-grid sca-calendar-grid--head">
              {DAYS.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="sca-calendar-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = getEventsForDate(iso);
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <div
                    key={iso}
                    className={`sca-calendar-day${isToday ? ' sca-calendar-day--today' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOnDate(iso)}
                  >
                    <span className="sca-calendar-day__num">{day}</span>
                    {dayEvents.map((e) => (
                      <div
                        key={e.id}
                        className="sca-calendar-event"
                        style={{ background: `${e.color}22`, color: e.color }}
                        draggable={user?.role === 'teacher' || user?.role === 'admin'}
                        onDragStart={() => setDragId(e.id)}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="sca-card">
            <h3 className="sca-section-title">This month</h3>
            {monthEvents.sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
              <div key={e.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 4, borderRadius: 4, background: e.color }} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13 }}>{e.title}</p>
                  <p style={{ fontSize: 12, color: COLORS.textMuted }}>{formatDate(e.date)} · {e.type}</p>
                </div>
              </div>
            ))}
            {!monthEvents.length && <p className="sca-muted">No events this month.</p>}
          </div>
        </div>
      ) : (
        <div className="sca-card sca-calendar-week">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>Week of {formatDate(weekStart)}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="sca-btn sca-btn-ghost" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>‹</button>
              <button type="button" className="sca-btn sca-btn-ghost" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>›</button>
            </div>
          </div>
          <div className="sca-calendar-week-grid">
            {weekDays.map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const dayEvents = getEventsForDate(iso);
              return (
                <div key={iso} className="sca-calendar-week-col" onDragOver={(e) => e.preventDefault()} onDrop={() => dropOnDate(iso)}>
                  <p className="sca-calendar-week-col__head">{DAYS[d.getDay()]} {d.getDate()}</p>
                  {dayEvents.map((e) => (
                    <div key={e.id} className="sca-calendar-event" style={{ background: `${e.color}22`, color: e.color }} draggable onDragStart={() => setDragId(e.id)}>{e.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Add event" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="sca-input" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} aria-label="Event title" />
            <input className="sca-input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} aria-label="Event date" />
            <select className="sca-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} aria-label="Event type">
              <option value="event">Event</option>
              <option value="deadline">Deadline</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
            </select>
            {teacherClasses.length > 0 && (
              <select className="sca-input" value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} aria-label="Class">
                <option value="">No class</option>
                {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button type="button" className="sca-btn sca-btn-primary" onClick={async () => { await createEvent({ ...form, classId: form.classId || null }); setShowAdd(false); }}>Save</button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
