import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X } from 'lucide-react';
import type { UiMessage } from '../lib/chatTypes';
import { parseContent } from '../lib/markers';

interface Props {
  pins: UiMessage[];
  meId: string;
  canManage: boolean;
  onJump: (id: string) => void;
  onUnpin: (id: string) => void;
}

/** The ridge-rail: pinned scrolls glanceable above the current. */
export default function PinBar({ pins, meId, canManage, onJump, onUnpin }: Props) {
  if (!pins.length) return null;
  return (
    <div className="relative z-10 border-b copper-rule bg-gradient-to-r from-turmeric/12 to-transparent px-3 py-1.5 backdrop-blur-sm sm:px-5">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        <span className="flex shrink-0 items-center gap-1.5 font-serif text-[10.5px] uppercase tracking-[0.18em] text-turmeric-deep dark:text-turmeric">
          <Pin size={11} /> ridge
        </span>
        <AnimatePresence initial={false}>
          {pins.map((m) => {
            const parsed = parseContent(m.content);
            const canUnpin = canManage || m.sender_id === meId;
            return (
              <motion.button
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                onClick={() => onJump(m.id)}
                className="group flex shrink-0 items-center gap-2 rounded-full border border-turmeric/50 bg-cream py-1 pl-3 pr-2 text-left shadow-soft transition hover:shadow-turmeric dark:bg-midnight-800"
              >
                <span className="max-w-[190px] truncate text-[12px] text-charcoal-soft dark:text-[#efe6d2]">
                  <span className="font-serif text-[10.5px] text-copper dark:text-glow-dim">{m.users?.display_name || 'Sage'}: </span>
                  {parsed.text ? parsed.text.slice(0, 60) : '📷 kept image'}
                  {parsed.text.length > 60 ? '…' : ''}
                </span>
                {canUnpin && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onUnpin(m.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onUnpin(m.id); } }}
                    className="grid h-5 w-5 place-items-center rounded-full text-charcoal-mute transition hover:bg-red-800/10 hover:text-red-700"
                    aria-label="Unpin"
                  >
                    <X size={11} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
