import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Megaphone, Search, Users, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ChatUser } from '../lib/chatTypes';
import Avatar from './Avatar';
import { useChatUI } from '../store/chatStore';
import { useDebounce } from '../hooks/useDebounce';

type Mode = 'sakhi' | 'circle' | 'sangha';

export default function NewChatModal() {
  const qc = useQueryClient();
  const setNewChatOpen = useChatUI((s) => s.setNewChatOpen);
  const openChat = useChatUI((s) => s.openChat);
  const showToast = useChatUI((s) => s.showToast);

  const [mode, setMode] = useState<Mode>('sakhi');
  const [raw, setRaw] = useState('');
  const q = useDebounce(raw.trim(), 300);
  const [picked, setPicked] = useState<ChatUser[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data: found, isFetching } = useQuery({
    queryKey: ['vaani', 'user-search', q],
    enabled: q.length >= 2,
    queryFn: () => apiFetch<{ data: ChatUser[] }>(`/api/chat/users?q=${encodeURIComponent(q)}`),
  });
  const users = found?.data ?? [];

  const close = () => setNewChatOpen(false);

  const startDm = async (u: ChatUser) => {
    setBusy(true); setError('');
    try {
      const r = await apiFetch<{ chat_id: string }>('/api/chat/dm', { method: 'POST', body: JSON.stringify({ user_id: u.id }) });
      await qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      close();
      openChat(r.chat_id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open the conversation'); }
    setBusy(false);
  };

  const createCircle = async () => {
    if (busy) return;
    setError('');
    if (name.trim().length < 3) { setError(mode === 'sangha' ? 'Name your Sangha (3+ characters)' : 'Name your circle (3+ characters)'); return; }
    if (picked.length === 0) { setError('Call at least one soul in'); return; }
    setBusy(true);
    try {
      const r = await apiFetch<{ chat_id: string }>('/api/chat/chats', {
        method: 'POST',
        body: JSON.stringify({ type: mode === 'sangha' ? 'channel' : 'group', name: name.trim(), member_ids: picked.map((u) => u.id) }),
      });
      await qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      showToast(mode === 'sangha' ? 'The Sangha begins to speak' : 'The circle joins hands');
      close();
      openChat(r.chat_id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Creation failed'); }
    setBusy(false);
  };

  const togglePick = (u: ChatUser) =>
    setPicked((p) => (p.some((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u]));

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-midnight-900/55 backdrop-blur-sm" onClick={close} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl ayur-glass shadow-lift"
      >
        <div className="flex items-center justify-between border-b copper-rule px-5 py-4">
          <div>
            <h2 className="font-serif text-lg text-neem-deep dark:text-glow">Kindle a new thread</h2>
            <p className="text-[11.5px] text-charcoal-mute dark:text-glow-dim">a sakhi, a circle, or a Sangha to address many</p>
          </div>
          <button onClick={close} className="grid h-9 w-9 place-items-center rounded-full text-charcoal-mute transition hover:bg-turmeric/15 hover:text-copper" aria-label="Close"><X size={17} /></button>
        </div>

        {/* mode tabs */}
        <div className="grid grid-cols-3 gap-1.5 px-5 pt-4">
          {([
            { id: 'sakhi', label: 'Sakhi', icon: Search, hint: 'one to one' },
            { id: 'circle', label: 'Circle', icon: Users, hint: 'many voices' },
            { id: 'sangha', label: 'Sangha', icon: Megaphone, hint: 'one voice, many ears' },
          ] as const).map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                mode === id
                  ? 'border-turmeric bg-turmeric/15 shadow-turmeric'
                  : 'border-copper/25 hover:border-copper/60 dark:border-midnight-600'
              }`}
            >
              <p className={`flex items-center gap-1.5 font-serif text-[13px] ${mode === id ? 'text-turmeric-deep dark:text-turmeric' : 'text-charcoal-soft dark:text-glow-dim'}`}>
                <Icon size={13} /> {label}
              </p>
              <p className="mt-0.5 text-[10px] text-charcoal-mute dark:text-glow-dim/70">{hint}</p>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 pt-4">
          {mode !== 'sakhi' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'sangha' ? 'Name of the Sangha…' : 'Name of the circle…'}
              maxLength={48}
              className="mb-3 w-full rounded-xl border border-copper/35 bg-white/80 px-4 py-2.5 font-serif text-[15px] text-charcoal placeholder:text-charcoal-mute/60 focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700 dark:text-[#efe6d2]"
            />
          )}

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-mute" />
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={mode === 'sakhi' ? 'Search @username or name…' : 'Call souls in — search and tap to add…'}
              className="w-full rounded-xl border border-copper/35 bg-white/80 py-2.5 pl-9 pr-4 text-[13.5px] text-charcoal focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700 dark:text-[#efe6d2]"
            />
            {isFetching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-copper" />}
          </div>

          {/* picked chips for group/channel */}
          {mode !== 'sakhi' && picked.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {picked.map((u) => (
                <button key={u.id} onClick={() => togglePick(u)} className="flex items-center gap-1.5 rounded-full bg-neem pl-1 pr-2.5 py-1 text-[11.5px] font-semibold text-cream transition hover:bg-neem-deep">
                  <Avatar src={u.avatar_url} name={u.display_name} size={18} ring={false} />
                  {u.display_name} <X size={11} />
                </button>
              ))}
            </div>
          )}

          {/* results */}
          <div className="slim-scroll mt-3 max-h-56 space-y-1 overflow-y-auto">
            {q.length < 2 && <p className="py-6 text-center text-[12px] italic text-charcoal-mute">whisper at least two letters…</p>}
            {q.length >= 2 && !isFetching && users.length === 0 && (
              <p className="py-6 text-center text-[12px] italic text-charcoal-mute">no soul by that name wanders here yet</p>
            )}
            {users.map((u) => {
              const sel = picked.some((x) => x.id === u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => (mode === 'sakhi' ? startDm(u) : togglePick(u))}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                    sel ? 'bg-turmeric/15 ring-1 ring-turmeric' : 'hover:bg-sand-200/70 dark:hover:bg-midnight-700/70'
                  }`}
                >
                  <Avatar src={u.avatar_url} name={u.display_name} size={38} lastSeen={u.last_seen} ring={false} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-charcoal dark:text-[#efe6d2]">
                      {u.display_name}
                      {u.status && <span className="text-[11px]" title={u.status.text}>{u.status.emoji}</span>}
                    </p>
                    <p className="truncate text-[11.5px] text-charcoal-mute dark:text-glow-dim">@{u.username}</p>
                  </div>
                  {mode !== 'sakhi' && (
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-2 transition ${sel ? 'border-turmeric bg-turmeric text-charcoal' : 'border-copper/40'}`}>
                      {sel && '✓'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-lg bg-red-900/10 px-3.5 py-2 text-[12px] font-medium text-red-800 dark:text-red-300">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {mode !== 'sakhi' && (
            <button
              onClick={createCircle}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neem py-3 font-serif text-[15px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric disabled:opacity-60 dark:bg-turmeric dark:text-charcoal"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === 'sangha' ? 'Raise the Sangha' : 'Join the hands'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
