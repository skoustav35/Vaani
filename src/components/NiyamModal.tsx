import { useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Loader2, LogOut, Moon, Sun, Wind, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ChatUser } from '../lib/chatTypes';
import Avatar from './Avatar';
import supabase from '../lib/supabase';
import { useChatUI } from '../store/chatStore';

export default function NiyamModal({ me }: { me: ChatUser }) {
  const qc = useQueryClient();
  const setNiyamOpen = useChatUI((s) => s.setNiyamOpen);
  const showToast = useChatUI((s) => s.showToast);
  const dark = useChatUI((s) => s.dark);
  const toggleDark = useChatUI((s) => s.toggleDark);

  const [name, setName] = useState(me.display_name);
  const [username, setUsername] = useState(me.username);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState(me.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [statusEmoji, setStatusEmoji] = useState(me.status?.emoji ?? '🌿');
  const [statusText, setStatusText] = useState(me.status?.text ?? '');

  const close = () => setNiyamOpen(false);

  const pickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Only images may carry your face'); return; }
    if (file.size > 6 * 1024 * 1024) { setError('Keep the portrait under 6 MB'); return; }
    setUploading(true);
    setError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { url } = await apiFetch<{ url: string }>('/api/chat/upload', {
        method: 'POST',
        body: JSON.stringify({ fileName: `avatar-${file.name}`, fileBase64: base64, contentType: file.type }),
      });
      setAvatar(url);
      showToast('The portrait is gilded');
    } catch (err) { setError(err instanceof Error ? err.message : 'The portrait would not set'); }
    setUploading(false);
  };

  const save = async () => {
    if (busy) return;
    setError('');
    if (name.trim().length < 2) { setError('A name must hold at least two letters'); return; }
    setBusy(true);
    try {
      await apiFetch('/api/chat/profile', {
        method: 'POST',
        body: JSON.stringify({
          display_name: name.trim(),
          username,
          avatar_url: avatar,
          status_emoji: statusEmoji,
          status_text: statusText,
        }),
      });
      await qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      showToast('The record is amended');
      close();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not amend'); }
    setBusy(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    close();
  };

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
            <h2 className="font-serif text-lg text-neem-deep dark:text-glow">Niyam</h2>
            <p className="text-[11.5px] text-charcoal-mute dark:text-glow-dim">rules &amp; routines of your account</p>
          </div>
          <button onClick={close} className="grid h-9 w-9 place-items-center rounded-full text-charcoal-mute transition hover:bg-turmeric/15 hover:text-copper" aria-label="Close"><X size={17} /></button>
        </div>

        <div className="slim-scroll max-h-[80dvh] space-y-5 overflow-y-auto px-5 py-5">
          {/* portrait + bhava */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={avatar} name={name} size={64} />
              <button
                onClick={() => document.getElementById('niyam-avatar')?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-cream bg-turmeric text-charcoal shadow-turmeric transition hover:scale-110 dark:border-midnight-800"
                aria-label="Change portrait"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
              <input id="niyam-avatar" type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[16px] text-charcoal dark:text-[#efe6d2]">{me.display_name}</p>
              <p className="truncate font-mono text-[11.5px] text-charcoal-mute dark:text-glow-dim">{me.phone_number}</p>
              <p className="mt-1 text-[11px] italic text-copper dark:text-glow-dim">tap the cam — the court keeps a living portrait</p>
            </div>
          </div>

          {/* bhava — status */}
          <div className="rounded-2xl border border-turmeric/40 bg-turmeric/8 p-4 dark:border-turmeric/30">
            <p className="mb-2.5 flex items-center gap-2 font-serif text-[11px] uppercase tracking-[0.18em] text-turmeric-deep dark:text-turmeric">
              <Wind size={12} /> Bhava — your present wind
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['🌿', '🧘', '🔥', '✍️', '🏔️', '🪔', '🎵', '📜', '🌙', '🚶'].map((e) => (
                <button
                  key={e}
                  onClick={() => setStatusEmoji(e)}
                  className={`grid h-9 w-9 place-items-center rounded-full text-[16px] transition ${statusEmoji === e ? 'scale-110 bg-turmeric/30 ring-2 ring-turmeric shadow-turmeric' : 'bg-cream hover:bg-sand-200 dark:bg-midnight-700 dark:hover:bg-midnight-600'}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={90}
              placeholder="e.g. brewing kadha · dawn on the ridge · in deep study"
              className="mt-3 w-full rounded-xl border border-turmeric/40 bg-white/85 px-4 py-2.5 text-[13px] text-charcoal placeholder:text-charcoal-mute/60 focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700 dark:text-[#efe6d2]"
            />
            {(statusText || statusEmoji) && (
              <p className="mt-2 rounded-lg bg-cream/70 px-3 py-2 text-[12px] text-charcoal-soft dark:bg-midnight-800/70 dark:text-glow-dim">
                sakhis will see: {statusEmoji} <span className="font-medium">{statusText || '…in quiet practice'}</span>
              </p>
            )}
          </div>

          {/* theme */}
          <button onClick={toggleDark} className="flex w-full items-center justify-between rounded-2xl border border-copper/30 px-4 py-3.5 transition hover:border-turmeric dark:border-midnight-600">
            <span className="flex items-center gap-3">
              {dark ? <Moon size={17} className="text-glow" /> : <Sun size={17} className="text-turmeric-deep" />}
              <span className="text-left">
                <span className="block text-[13.5px] font-semibold text-charcoal dark:text-[#efe6d2]">{dark ? 'Tamra Prahara — dusk mode' : 'Bhanu Prahara — day mode'}</span>
                <span className="block text-[11px] text-charcoal-mute dark:text-glow-dim">midnight-indigo ink &amp; copper glow, or sandalwood light</span>
              </span>
            </span>
            <span className={`relative h-6 w-11 rounded-full transition ${dark ? 'bg-turmeric' : 'bg-sand-300'}`}>
              <motion.span layout className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow ${dark ? 'right-0.5' : 'left-0.5'}`} />
            </span>
          </button>

          {/* identity */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-serif text-[11px] uppercase tracking-[0.18em] text-copper dark:text-glow-dim">Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
                className="w-full rounded-xl border border-copper/35 bg-white/80 px-4 py-2.5 text-[14px] text-charcoal focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700 dark:text-[#efe6d2]" />
            </div>
            <div>
              <label className="mb-1 block font-serif text-[11px] uppercase tracking-[0.18em] text-copper dark:text-glow-dim">Username</label>
              <div className="flex items-center rounded-xl border border-copper/35 bg-white/80 px-4 focus-within:border-turmeric focus-within:ring-2 focus-within:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700">
                <span className="text-charcoal-mute dark:text-glow-dim">@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={30}
                  className="w-full bg-transparent px-1.5 py-2.5 text-[14px] text-charcoal focus:outline-none dark:text-[#efe6d2]" />
              </div>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg bg-red-900/10 px-3.5 py-2 text-[12px] font-medium text-red-800 dark:text-red-300">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <button onClick={save} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-neem py-3 font-serif text-[15px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric disabled:opacity-60 dark:bg-turmeric dark:text-charcoal">
              {busy && <Loader2 size={15} className="animate-spin" />} Amend the record
            </button>
          </div>

          <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-900/25 py-3 text-[13.5px] font-semibold text-red-800 transition hover:bg-red-900/5 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-900/20">
            <LogOut size={15} /> Depart Vaani
          </button>

          <p className="text-center font-serif text-[10.5px] tracking-[0.2em] text-charcoal-mute/70 dark:text-glow-dim/60">VAANI · SPEAK GENTLY, ARRIVE INSTANTLY</p>
        </div>
      </motion.div>
    </div>
  );
}
