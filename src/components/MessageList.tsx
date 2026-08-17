import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown } from 'lucide-react';
import type { UiMessage } from '../lib/chatTypes';
import { chatDayLabel } from '../lib/chatTypes';
import MessageBubble from './MessageBubble';
import MandalaSpinner from './MandalaSpinner';
import type { MenuAction } from './MessageMenu';
import type { ReactionMap } from '../hooks/useExtras';

interface ListItem {
  key: string;
  kind: 'sep' | 'msg';
  label?: string;
  msg?: UiMessage;
}

export interface ListHandle {
  toBottom: () => void;
  jumpTo: (id: string) => void;
}

function buildItems(messages: UiMessage[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDay = '';
  for (const m of messages) {
    const day = chatDayLabel(m.created_at);
    if (day !== lastDay) {
      lastDay = day;
      items.push({ key: `sep-${day}-${m.id}`, kind: 'sep', label: day });
    }
    items.push({ key: m.id, kind: 'msg', msg: m });
  }
  return items;
}

interface Props {
  messages: UiMessage[];
  meId: string;
  showSenderNames: boolean;
  canManage: boolean;
  hasOlder: boolean;
  fetchingOlder: boolean;
  fetchOlder: () => void;
  isLoading: boolean;
  onImageClick: (url: string) => void;
  onRetry: (msg: UiMessage) => void;
  onAction: (action: MenuAction, msg: UiMessage) => void;
  handle: MutableRefObject<ListHandle | null>;
  highlightedId: string | null;
  isSnehra: boolean;
  reactions: ReactionMap;
  onBless: (messageId: string, emoji: string) => void;
}

export default function MessageList({
  messages, meId, showSenderNames, canManage, hasOlder, fetchingOlder, fetchOlder,
  isLoading, onImageClick, onRetry, onAction, handle, highlightedId, isSnehra, reactions, onBless,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const items = buildItems(messages);
  const itemsLenRef = useRef(items.length);
  const nearBottomRef = useRef(true);
  const firstLoadRef = useRef(true);
  const prependingRef = useRef<{ total: number; top: number } | null>(null);
  const newBelowRef = useRef(0);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 14,
    getItemKey: (i) => items[i].key,
  });

  const toBottom = useCallback(() => {
    newBelowRef.current = 0;
    nearBottomRef.current = true;
    const n = buildItemsRef.current.length || items.length;
    virtualizer.scrollToIndex(Math.max(0, n - 1), { align: 'end' });
  }, [virtualizer, items.length]);

  /* imperative handle for ChatWindow */
  const buildItemsRef = useRef(items);
  buildItemsRef.current = items;
  useEffect(() => {
    handle.current = {
      toBottom,
      jumpTo: (id: string) => {
        const idx = buildItemsRef.current.findIndex((i) => i.key === id);
        if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center', behavior: 'smooth' });
      },
    };
  }, [handle, toBottom, virtualizer]);

  useLayoutEffect(() => {
    if (!isLoading && items.length > 0 && firstLoadRef.current) {
      firstLoadRef.current = false;
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
      requestAnimationFrame(() => virtualizer.scrollToIndex(items.length - 1, { align: 'end' }));
      setTimeout(() => virtualizer.scrollToIndex(items.length - 1, { align: 'end' }), 120);
    }
  }, [isLoading, items.length, virtualizer]);

  /* new arrivals */
  useEffect(() => {
    const grewBy = items.length - itemsLenRef.current;
    itemsLenRef.current = items.length;
    if (grewBy > 0) {
      if (nearBottomRef.current) {
        requestAnimationFrame(toBottom);
      } else {
        newBelowRef.current += grewBy;
        setFabVisible(true);
      }
    }
  }, [items.length, toBottom]);

  /* prepend anchoring */
  useLayoutEffect(() => {
    const anchor = prependingRef.current;
    if (!anchor || fetchingOlder) return;
    const el = parentRef.current;
    if (!el) return;
    const diff = virtualizer.getTotalSize() - anchor.total;
    if (diff > 0) el.scrollTop = anchor.top + diff;
    prependingRef.current = null;
  }, [messages, fetchingOlder, virtualizer]);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isBottom = distanceFromBottom < 240;
    if (isBottom && !nearBottomRef.current) newBelowRef.current = 0;
    nearBottomRef.current = isBottom;
    if (el.scrollTop < 90 && hasOlder && !fetchingOlder) {
      prependingRef.current = { total: virtualizer.getTotalSize(), top: el.scrollTop };
      fetchOlder();
    }
    setFabVisible((v) => {
      const next = !isBottom;
      return v === next ? v : next;
    });
  }, [hasOlder, fetchingOlder, fetchOlder, virtualizer]);

  const [fabVisible, setFabVisible] = useState(false);

  if (isLoading) {
    return (
      <div className="grid flex-1 place-items-center">
        <MandalaSpinner size={52} label="Unrolling the scroll…" />
      </div>
    );
  }

  let prevSender = '';
  let prevTime = 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" style={{ minHeight: 0 }}>
      <div ref={parentRef} onScroll={onScroll} className="slim-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6">
        <AnimatePresence>
          {fetchingOlder && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-2 z-10 flex justify-center">
              <div className="rounded-full ayur-glass px-3 py-1.5 shadow-soft">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-copper border-t-transparent" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <p className="font-serif text-lg text-charcoal-soft dark:text-glow-dim">The scroll is blank.</p>
              <p className="mt-1 text-sm text-charcoal-mute">Speak the first word — rivers begin with one drop.</p>
            </div>
          </div>
        )}

        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const item = items[vi.index];

            if (item.kind === 'sep') {
              return (
                <div key={item.key} data-index={vi.index} ref={virtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                  className="flex justify-center py-3"
                >
                  <span className="rounded-full ayur-glass px-4 py-1.5 font-serif text-[11.5px] tracking-[0.16em] text-copper shadow-soft dark:text-glow">
                    {item.label?.toUpperCase()}
                  </span>
                </div>
              );
            }

            const m = item.msg!;
            const mine = m.sender_id === meId;
            const t = new Date(m.created_at).getTime();
            const firstOfRun = m.sender_id !== prevSender || t - prevTime > 4 * 60_000;
            prevSender = m.sender_id;
            prevTime = t;

            return (
              <div key={item.key} data-index={vi.index} ref={virtualizer.measureElement}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                className="pb-1"
              >
                <MessageBubble
                  msg={m}
                  mine={mine}
                  firstOfRun={firstOfRun}
                  showSenderName={showSenderNames && !mine}
                  botFlair={isSnehra && !mine}
                  canManage={canManage}
                  highlight={highlightedId === m.id}
                  reactions={Object.entries(reactions[m.id] || {}).map(([emoji, g]) => ({ emoji, count: g.count, mine: g.mine }))}
                  onBless={(emoji) => onBless(m.id, emoji)}
                  onImageClick={onImageClick}
                  onRetry={onRetry}
                  onAction={onAction}
                  onJump={(id) => handle.current?.jumpTo(id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* jump to latest */}
      <AnimatePresence>
        {fabVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            onClick={toBottom}
            className="absolute bottom-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-full ayur-glass text-copper shadow-lift transition hover:shadow-turmeric dark:text-glow"
            aria-label="Jump to the newest"
          >
            <ArrowDown size={17} />
            {newBelowRef.current > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid min-w-[20px] place-items-center rounded-full bg-turmeric px-1.5 py-[2px] text-[10px] font-bold text-charcoal shadow-turmeric">
                {newBelowRef.current}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}


