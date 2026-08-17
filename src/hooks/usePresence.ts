import { useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';

/** Beat of the heart — keeps users.last_seen fresh while the app breathes. */
export function usePresenceHeartbeat() {
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      apiFetch('/api/chat/presence', { method: 'POST', body: '{}' }).catch(() => undefined);
    };
    beat();
    timer.current = setInterval(beat, 25_000);
    const onVis = () => beat();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}
