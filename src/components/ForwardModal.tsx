import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Forward, Loader2 } from 'lucide-react';
import type { ChatSummary } from '../lib/chatTypes';
import Avatar from './Avatar';
import { useChatUI } from '../store/chatStore';

interface Props {
  chats: ChatSummary[];
  currentChatId: string | null;
  sending: boolean;
  onForward: (targetIds: string[]) => Promise<void>;
}

export default function ForwardModal({ chats, currentChatId, sending, onForward }: Props) {
  const forward = useChatUI((s) => s.forward);
  const closeForward = useChatUI((s) => s.closeForward);
  const [picked, setPicked] = useState<string[]>([]);

  const candidates = chats.filter((c) => c.id !== currentChatId);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const go = async () => {
    if (!picked.length || sending) return;
    await onForward(picked);
    setPicked([]);
  };

  return (
    <AnimatePresence>
      {forward.open && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-midnight-900/55 backdrop-blur-sm" onClick={closeForward} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl ayur-glass shadow-lift"
          >
            <div className="border-b copper-rule px-5 py-4">
              <h2 className="flex items-center gap-2 font-serif text-lg text-neem-deep dark:text-glow"><Forward size={16} /> Carry these words to…</h2>
              <p className="mt-0.5 text-[11.5px] text-charcoal-mute dark:text-glow-dim">choose one or many threads</p>
            </div>
            <div className="slim-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
              {candidates.map((c) => {
                const sel = picked.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${sel ? 'bg-turmeric/15 ring-1 ring-turmeric' : 'hover:bg-sand-200/70 dark:hover:bg-midnight-700/60'}`}
                  >
                    <Avatar src={c.type === 'direct' ? c.other_user?.avatar_url ?? c.avatar_url : null} name={c.title} size={38} ring={false} />
                    <span className="min-w-0 flex-1 truncate font-serif text-[14.5px] text-charcoal dark:text-[#efe6d2]">{c.title}</span>
                    <span className={`grid h-5 w-5 place-items-center rounded-full border-2 transition ${sel ? 'border-turmeric bg-turmeric text-charcoal' : 'border-copper/40'}`}>
                      {sel && <Check size={11} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="border-t copper-rule p-4">
              <button
                onClick={go}
                disabled={!picked.length || sending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-neem py-3 font-serif text-[15px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric disabled:opacity-50 dark:bg-turmeric dark:text-charcoal"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Forward size={15} />}
                Forward to {picked.length ? `${picked.length} thread${picked.length > 1 ? 's' : ''}` : '…'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
