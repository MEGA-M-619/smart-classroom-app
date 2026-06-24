import { useEffect, useRef } from 'react';
import { getToken } from '../api.js';
import { apiUrl } from '../config.js';

export function useNotificationStream(onUpdate) {
  const lastIdRef = useRef(0);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    let es;
    let pollTimer;
    let closed = false;

    const poll = async () => {
      try {
        const data = await fetch(apiUrl(`/notifications/updates?after=${lastIdRef.current}`), {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        if (data.notifications?.length) {
          lastIdRef.current = Math.max(...data.notifications.map((n) => n.id));
          onUpdateRef.current?.(data);
        }
      } catch { /* offline */ }
    };

    const startPoll = () => {
      poll();
      pollTimer = window.setInterval(poll, 20000);
    };

    if (typeof EventSource !== 'undefined' && !import.meta.env.SSR) {
      try {
        es = new EventSource(`${apiUrl('/notifications/stream')}?token=${encodeURIComponent(token)}`);
        es.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (payload.event === 'notification' && payload.data?.id) {
              lastIdRef.current = Math.max(lastIdRef.current, payload.data.id);
              onUpdateRef.current?.({ notifications: [payload.data], unread: null });
            }
          } catch { /* ignore */ }
        };
        es.onerror = () => {
          es?.close();
          if (!closed) startPoll();
        };
      } catch {
        startPoll();
      }
    } else {
      startPoll();
    }

    return () => {
      closed = true;
      es?.close();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, []);
}
