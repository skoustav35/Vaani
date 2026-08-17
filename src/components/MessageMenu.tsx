import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Archive, Copy, Eraser, Forward, Hammer, Heart, Pencil, Pin, Reply, Trash2 } from 'lucide-react';
import type { UiMessage } from '../lib/chatTypes';
import { parseContent } from '../lib/markers';

export type MenuAction = 'reply' | 'copy' | 'forward' | 'bhandar' | 'edit' | 'delete' | 'deleteMe' | 'pin' | 'bless' | 'menu' | 'studio' | 'deletePrompt';

interface Props {
  msg: UiMessage | null;
  mine: boolean;
  canDelete: boolean;
  blessed: boolean;
  pinnedHere: boolean;
  onClose: () => void;
  onAction: (action: MenuAction, msg: UiMessage) => void;
}

/** All rites for one message — a leaf that floats up into view. */
export default function MessageMenu({ msg, mine, canDelete, blessed, pinnedHere, onClose, onAction }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<'everyone' | 'me' | null>(null);
  useEffect(() => setConfirmDelete(null), [msg]);
  if (!msg) return null;
  const parsed = parseContent(msg.content);

  const rites = [
    { a: 'reply' as MenuAction, icon: Reply, label: 'Reply with a whisper' },
    { a: 'bless' as MenuAction, icon: Heart, label: blessed ? 'Take back the blessing' : 'Bless it ❤️' },
    { a: 'copy' as MenuAction, icon: Copy, label: 'Copy the words', show: !!parsed.text },
    { a: 'forward' as MenuAction, icon: Forward, label: 'Forward onward' },
    { a: 'bhandar' as MenuAction, icon: Archive, label: 'Keep in Bhandar' },
    { a: 'pin' as MenuAction, icon: Pin, label: pinnedHere ? 'Lift from the ridge' : 'Pin to the ridge top' },
    { a: 'edit' as MenuAction, icon: Pencil, label: 'Re-carve (edit for all)', show: mine },
    { a: 'studio' as MenuAction, icon: Hammer, label: 'The Chisel Bench', note: 'case, polish, translations, Snehra rewrites', show: mine && !!parsed.text },
    { a: 'deleteMe' as MenuAction, icon: Eraser, label: 'Delete for me only', note: 'your scroll alone', warn: true },
    { a: 'delete' as MenuAction, icon: Trash2, label: 'Delete for everyone', note: 'every scroll, everywhere', show: canDelete, danger: true },
  ].filter((x) => x.show !== false);

  return (
    <AnimatePresence>
      {msg && (
        <>
          <motion.div className="fixed inset-0 z-[65] bg-midnight-900/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ y: '70%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '60%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-x-3 bottom-4 z-[66] rounded-3xl ayur-glass pb-[calc(6px+env(safe-area-inset-bottom))] shadow-lift sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[420px] sm:-translate-x-1/2"
            role="menu"
          >
            <div className="mx-auto mb-1 mt-2.5 h-1.5 w-10 rounded-full bg-sand-300 dark:bg-midnight-600" />
            <div className="slim-scroll max-h-[70dvh] overflow-y-auto p-2">
              {rites.map(({ a, icon: Icon, label, note, danger, warn }) => {
                const isDelete = a === 'delete' || a === 'deleteMe';
                const confirming = (a === 'delete' && confirmDelete === 'everyone') || (a === 'deleteMe' && confirmDelete === 'me');
                if (isDelete && confirming) {
                  return (
                    <motion.div
                      key={a}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="my-1 rounded-xl border border-red-800/25 bg-red-900/10 p-3 dark:border-red-400/25">
                        <p className="flex items-center gap-2 font-serif text-[13.5px] text-red-800 dark:text-red-300">
                          <Trash2 size={13} />
                          {a === 'delete' ? 'Carry it away from every scroll?' : 'Veil it from your scroll alone?'}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => onAction(a, msg)}
                            className="flex-1 rounded-lg bg-red-800 py-2 font-serif text-[13px] text-cream transition hover:bg-red-900 dark:bg-red-700 dark:hover:bg-red-800"
                          >
                            Yes, carry it away
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 rounded-lg border border-copper/40 py-2 font-serif text-[13px] text-charcoal-soft transition hover:bg-sand-200/70 dark:border-midnight-600 dark:text-glow-dim dark:hover:bg-midnight-700"
                          >
                            Keep it
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return (
                  <button
                    key={a}
                    onClick={() => {
                      if (isDelete && !confirming) {
                        setConfirmDelete(a === 'delete' ? 'everyone' : 'me');
                        return;
                      }
                      onAction(a, msg);
                    }}
                    className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left transition ${
                      danger || warn
                        ? `${warn ? 'text-amber-800/90 hover:bg-amber-700/10 dark:text-amber-200/90' : 'text-red-700/90 hover:bg-red-800/10 dark:text-red-300/90'}`
                        : 'text-charcoal hover:bg-turmeric/12 dark:text-[#efe6d2] dark:hover:bg-midnight-700'
                    }`}
                  >
                    <motion.span whileTap={{ scale: 0.8 }} className="grid place-items-center">
                      <Icon size={17} className={danger || warn ? '' : 'text-copper dark:text-glow'} />
                    </motion.span>
                    <span className="flex-1">
                      <span className="block font-serif text-[15px] leading-tight">{label}</span>
                      {note && <span className="block text-[10.5px] opacity-70">{note}</span>}
                    </span>
                    {isDelete && <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">confirm</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
