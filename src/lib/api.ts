import supabase from './supabase';

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(path, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) } });
  let payload: unknown = null;
  try { payload = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const msg = (payload as { error?: string } | null)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return payload as T;
}

/** Line-delimited JSON streaming for the Snehra gateway pipe. */
export async function apiStream(
  path: string,
  body: unknown,
  onFrame: (frame: Record<string, unknown>) => void
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { msg = ((await res.json()) as { error?: string }).error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  if (!res.body) throw new Error('The stream was silent');

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      try { onFrame(JSON.parse(l)); } catch { /* partial line, ignore */ }
    }
  }
  if (buf.trim()) {
    try { onFrame(JSON.parse(buf)); } catch { /* trailing partial */ }
  }
}
