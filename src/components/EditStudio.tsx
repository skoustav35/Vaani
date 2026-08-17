import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaseSensitive, Check, Hammer, Loader2, Music2, ScrollText, Sparkles, Type, Wand2, X } from 'lucide-react';
import * as React from 'react';
import type { UiMessage } from '../lib/chatTypes';
import { parseContent } from '../lib/markers';
import { apiFetch } from '../lib/api';

export interface EditStudioTarget { msg: UiMessage }

const QUICK_CHISELS: { id: string; label: string; hint: string; icon: typeof Type; run: (s: string) => string }[] = [
  { id: 'trim', label: 'Trim & tidy', hint: 'collapse double spaces, tidy edges', icon: ScrollText, run: (s) => s.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim() },
  { id: 'lines', label: 'Unroll lines', hint: 'join broken lines into flowing prose', icon: Type, run: (s) => s.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim() },
  { id: 'title', label: 'Title case', hint: 'Headline Every Word', icon: CaseSensitive, run: (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) },
  { id: 'caps', label: 'THUNDER CASE', hint: 'FOR WHEN THE ELEPHANTS MUST HEAR', icon: CaseSensitive, run: (s) => s.toUpperCase() },
  { id: 'lower', label: 'whisper case', hint: 'all lowercase, quietly', icon: Type, run: (s) => s.toLowerCase() },
  { id: 'deemoji', label: 'Stillest waters', hint: 'lift every emoji from the surface', icon: Sparkles, run: (s) => s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s{2,}/g, ' ').trim() },
  { id: 'ornament', label: 'Gild the edges', hint: 'frame the words with a soft ornament', icon: Wand2, run: (s) => `✦  ${s}  ✦` },
  { id: 'ps', label: 'Add a postscript', hint: 'append a warm P.S.', icon: Music2, run: (s) => `${s}\n\nP.S. ` },
];

const AI_CHISELS: { id: string; label: string; hint: string }[] = [
  { id: 'gentler', label: 'Softer touch', hint: 'warmer, kinder, same meaning' },
  { id: 'crisper', label: 'Sharp breath', hint: 'tighter, crisper, no needless word' },
  { id: 'poetic', label: 'Verse-form', hint: 'a small classical couplet' },
  { id: 'funny', label: 'Gentle wit', hint: 'warm humour, never mean' },
  { id: 'shloka', label: 'Shloka cadence', hint: 'solemn, balanced, brief' },
  { id: 'grammar', label: 'Grammar polish', hint: 'punctuation and flow only' },
  { id: 'formal', label: 'Lamplight formal', hint: 'dignified letter-grace' },
  { id: 'expand', label: 'Grow warmly', hint: 'a sentence or two fuller' },
  { id: 'hindi', label: 'Hindi · हिंदी', hint: 'natural, warm Devanagari' },
  { id: 'bengali', label: 'Bengali · বাংলা', hint: 'natural Bangla flow' },
];

interface Props {
  target: EditStudioTarget | null;
  onClose: () => void;
  onApply: (msgId: string, content: string) => Promise<void>;
}

/** The Chisel Bench — instant chisels plus Snehra's AI rewriting, applied with the edited seal. */
export default function EditStudio({ target, onClose, onApply }: Props) {
  const original = useMemo(() => (target ? parseContent(target.msg.content).text : ''), [target]);
  const [draft, setDraft] = useState(original);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);

  // reseed when a new message is benched
  React.useEffect(() => { setDraft(original); setError(''); setBusy(null); setAppliedCount(0); }, [original, target?.msg.id]);

  const quick = (id: string, run: (s: string) => string) => {
    setDraft((d) => run(d));
    setAppliedCount((c) => c + 1);
    void id;
  };

  const aiChisel = async (id: string) => {
    if (busy) return;
    setBusy(id);
    setError('');
    try {
      const r = await apiFetch<{ text: string }>('/api/chat/rewrite', {
        method: 'POST',
        body: JSON.stringify({ text: draft, instruction: id, message_id: target?.msg.id }),
      });
      setDraft(r.text);
      setAppliedCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The chisel slipped');
    } finally {
      setBusy(null);
    }
  };

  const apply = async () => {
    if (!target) return;
    const next = draft.trim();
    if (!next) { setError('A message cannot be hollow'); return; }
    setBusy('apply');
    try {
      await onApply(target.msg.id, next);
      onClose();
    } catch { setError('Could not re-carve'); setBusy(null); }
  };

  const bare = original.replace(/\s+/g, ' ').trim();
  const changed = draft.replace(/✦\s*/g, '').replace(/\s+/g, ' ').trim() !== bare;

  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[78] grid place-items-end sm:place-items-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-midnight-900/55 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '70%', opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '60%', opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 330, damping: 30 }}
            className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl ayur-glass shadow-lift sm:rounded-3xl"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-sand-300 dark:bg-midnight-600 sm:hidden" />
            <div className="flex items-center justify-between border-b copper-rule px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-serif text-lg text-neem-deep dark:text-glow"><Hammer size={16} className="text-copper dark:text-glow" /> The Chisel Bench</h2>
                <p className="mt-0.5 text-[11.5px] text-charcoal-mute dark:text-glow-dim">shape what you already sent — the seal 'edited' marks the change</p>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-charcoal-mute transition hover:bg-turmeric/15 hover:text-copper" aria-label="Close"><X size={17} /></button>
            </div>

            <div className="slim-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* the anvil: live draft */}
              <label className="mb-1.5 block font-serif text-[10.5px] uppercase tracking-[0.22em] text-copper dark:text-glow-dim">on the anvil</label>
              <textarea
                value={draft}
                onChange={(e) => { setDraft(e.target.value); }}
                rows={4}
                className="slim-scroll w-full resize-none rounded-2xl border border-copper/35 bg-white/80 p-4 text-[14.5px] leading-relaxed text-charcoal shadow-inner focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-800 dark:text-[#efe6d2]"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-charcoal-mute dark:text-glow-dim">
                <span>{changed ? `${appliedCount} chisel${appliedCount === 1 ? '' : 's'} struck` : 'uncarved — as sent'}</span>
                <span className="font-mono tabular-nums">{draft.length}/3900</span>
              </div>

              {/* quick chisels */}
              <p className="mt-5 mb-2 font-serif text-[10.5px] uppercase tracking-[0.22em] text-copper dark:text-glow-dim">instant chisels</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {QUICK_CHISELS.map((c) => (
                  <motion.button
                    key={c.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => quick(c.id, c.run)}
                    title={c.hint}
                    className="rounded-xl border border-copper/30 bg-cream/80 px-2.5 py-2.5 text-left transition hover:border-turmeric hover:shadow-turmeric dark:border-midnight-600 dark:bg-midnight-800"
                  >
                    <c.icon size={14} className="text-copper dark:text-glow" />
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-charcoal dark:text-[#efe6d2]">{c.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* snehra's chisel */}
              <p className="mt-5 mb-2 flex items-center gap-1.5 font-serif text-[10.5px] uppercase tracking-[0.22em] text-turmeric-deep dark:text-turmeric">
                <Sparkles size={11} /> Snehra's chisel — Snehra-6.7-Ultra
              </p>
              <div className="grid grid-cols-2 gap-2">
                {AI_CHISELS.map((c) => (
                  <motion.button
                    key={c.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => aiChisel(c.id)}
                    disabled={!!busy}
                    title={c.hint}
                    className="rounded-xl border border-turmeric/40 bg-turmeric/10 px-3 py-2.5 text-left transition hover:bg-turmeric/20 hover:shadow-turmeric disabled:opacity-50 dark:bg-turmeric/5 dark:hover:bg-turmeric/12"
                  >
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-turmeric-deep dark:text-turmeric">
                      {busy === c.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {c.label}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-charcoal-mute dark:text-glow-dim">{c.hint}</span>
                  </motion.button>
                ))}
              </div>

              {error && <p className="mt-3 rounded-lg bg-red-900/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700 dark:text-red-300">{error}</p>}
            </div>

            <div className="flex gap-2.5 border-t copper-rule px-5 py-4">
              <button onClick={() => setDraft(original)} className="rounded-xl border border-copper/35 px-4 py-2.5 font-serif text-[13px] text-charcoal-soft transition hover:bg-sand-200/70 dark:border-midnight-600 dark:text-glow-dim dark:hover:bg-midnight-700">
                Restore the carve
              </button>
              <button
                onClick={apply}
                disabled={!!busy || !changed}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neem py-2.5 font-serif text-[14.5px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric disabled:opacity-50 dark:bg-turmeric dark:text-charcoal"
              >
                {busy === 'apply' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Strike the chisel — post the edit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

