import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, CheckCheck, Copy, Forward, Heart, MoreHorizontal, Pencil, Reply, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import type { ChatUser, UiMessage } from '../lib/chatTypes';
import { shortTime } from '../lib/chatTypes';
import { parseContent } from '../lib/markers';
import RichText, { streamSafe } from './RichText';
import type { MenuAction } from './MessageMenu';

interface Props {
  msg: UiMessage;
  mine: boolean;
  firstOfRun: boolean;
  showSenderName: boolean;
  botFlair: boolean;
  canManage: boolean;
  highlight: boolean;
  reactions: { emoji: string; count: number; mine: boolean }[];
  onBless: (emoji: string) => void;
  onImageClick: (url: string) => void;
  onRetry: (msg: UiMessage) => void;
  onAction: (action: MenuAction, msg: UiMessage) => void;
  onJump: (messageId: string) => void;
}

export default function MessageBubble({ msg, mine, firstOfRun, showSenderName, botFlair, canManage, highlight, reactions, onBless, onImageClick, onRetry, onAction, onJump }: Props) {
  const sender: ChatUser | null | undefined = msg.users;
  const [imgLoaded, setImgLoaded] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const parsed = parseContent(msg.content);

  const touchStart = () => {
    pressTimer.current = setTimeout(() => onAction('menu', msg), 430);
  };
  const touchEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`group/msg relative flex w-full ${mine ? 'justify-end' : 'justify-start'} ${firstOfRun ? 'mt-3.5' : 'mt-[3px]'}`}
    >
      {!mine && showSenderName ? (
        <div className="mr-2 w-8 shrink-0">
          {firstOfRun && sender && (
            <img src={sender.avatar_url} alt={sender.display_name} className="h-8 w-8 rounded-full border border-copper-faint object-cover dark:border-midnight-600" loading="lazy" />
          )}
        </div>
      ) : null}

      <div
        className={`relative max-w-[84%] sm:max-w-[68%] lg:max-w-[58%]`}
        onTouchStart={touchStart}
        onTouchEnd={touchEnd}
        onTouchCancel={touchEnd}
        onContextMenu={(e) => { e.preventDefault(); onAction('menu', msg); }}
      >
        {/* hover rail (desktop): reply · bless · forward · edit/more — hugging the bubble */}
        <div
          className={`pointer-events-none absolute top-1/2 z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-full ayur-glass px-1.5 py-1 opacity-0 shadow-soft transition-opacity group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 lg:flex ${mine ? 'right-full mr-2' : 'left-full ml-2'}`}
        >
          {([
            ['reply', Reply, 'Whisper back'],
            ['bless', Heart, 'Bless it'],
            ['forward', Forward, 'Carry onward'],
            [mine ? 'edit' : 'menu', mine ? Pencil : MoreHorizontal, mine ? 'Re-carve (edit)' : 'More rites'],
            ...(mine ? [['deletePrompt', Trash2, 'Carry away…'] as [MenuAction, typeof Reply, string]] : []),
          ] as [MenuAction, typeof Reply, string][]).map(([a, Icon, label]) => (
            <motion.button
              key={label}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => onAction(a, msg)}
              className={`grid h-7 w-7 place-items-center rounded-full transition hover:bg-turmeric/25 dark:hover:bg-midnight-700 ${a === 'bless' ? 'text-turmeric-deep dark:text-turmeric' : 'text-copper dark:text-glow'}`}
              aria-label={label}
              title={label}
            >
              <Icon size={14} />
            </motion.button>
          ))}
        </div>

        {!mine && showSenderName && firstOfRun && sender && (
          <p className="mb-1 ml-3 font-serif text-[12px] text-copper dark:text-glow-dim">{sender.display_name}</p>
        )}

        <motion.div
          animate={highlight ? { boxShadow: ['0 0 0 0 rgba(240,185,11,0)', '0 0 0 3px rgba(240,185,11,0.65)', '0 0 0 3px rgba(240,185,11,0)'] } : {}}
          transition={{ duration: 1.4 }}
          className={[
            'relative overflow-hidden px-3.5 pb-1.5 pt-2',
            mine
              ? 'bubble-self text-[#f5efdb]'
              : 'bubble-other border border-copper-faint/70 bg-cream text-charcoal shadow-soft dark:border-midnight-600 dark:bg-midnight-800 dark:text-[#efe6d2]',
            msg.pending ? 'opacity-75' : '',
            msg.failed ? 'border-red-700/40' : '',
            msg.streaming ? 'snehra-streaming' : '',
          ].join(' ')}
          style={
            msg.pending
              ? { boxShadow: '0 0 0 1.5px rgba(184,115,51,0.55), 0 0 18px rgba(240,185,11,0.25)' }
              : mine
                ? {
                    background: 'linear-gradient(148deg, #3d7c42 0%, #2c5f2d 52%, #1f4621 100%)',
                    border: '1px solid rgba(240,185,11,0.22)',
                    boxShadow: 'inset 0 1px 0 rgba(255,244,214,0.14), 0 4px 14px -4px rgba(30,70,33,0.45), 0 1px 3px rgba(30,70,33,0.28)',
                  }
                : undefined
          }
        >
          {/* golden rim shimmer on your own words */}
          {mine && !msg.pending && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{ background: 'radial-gradient(120px 40px at 85% -10%, rgba(240,185,11,0.22), transparent 70%)' }}
            />
          )}
          {/* organic copper tail */}
          <svg
            aria-hidden
            viewBox="0 0 14 12"
            className={`pointer-events-none absolute bottom-0 h-[12px] w-[14px] ${mine ? '-right-[6px]' : '-left-[6px] -scale-x-100'}`}
            style={{ overflow: 'visible' }}
          >
            {mine ? (
              <path d="M0 12 C0 5 2 1 12 0 L0 0 Z" fill="#1f4621" stroke="rgba(240,185,11,0.22)" strokeWidth="0.6" />
            ) : (
              <path d="M14 12 C14 5 12 1 2 0 L14 0 Z" fill="var(--tail-other, #fbf6e4)" stroke="rgba(184,115,51,0.35)" strokeWidth="0.6" />
            )}
          </svg>
          {msg.streaming && <span className="stream-tide" aria-hidden />}
          {botFlair && (
            <p className="mb-1 flex items-center gap-1.5 font-serif text-[10px] uppercase tracking-[0.18em] text-turmeric-deep dark:text-turmeric">
              <Sparkles size={10} /> Snehra · Snehra-6.7-Ultra
            </p>
          )}
          {/* forwarded ribbon */}
          {parsed.forwardFrom && (
            <p className={`mb-1 flex items-center gap-1.5 border-b pb-1 font-serif text-[11px] italic ${mine ? 'border-white/15 text-turmeric-soft' : 'border-sand-300 text-copper dark:border-midnight-600 dark:text-glow-dim'}`}>
              <Forward size={11} /> Forwarded from {parsed.forwardFrom}
            </p>
          )}

          {/* reply quote */}
          {parsed.reply && (
            <button
              onClick={() => onJump(parsed.reply!.id)}
              className={`mb-1.5 block w-full rounded-lg border-l-[3px] py-1 pl-2.5 pr-2 text-left text-[12px] leading-snug transition ${
                mine ? 'border-turmeric bg-white/10 hover:bg-white/15' : 'border-turmeric bg-turmeric/10 hover:bg-turmeric/15 dark:bg-midnight-700/60'
              }`}
            >
              <span className={`block font-serif text-[11px] ${mine ? 'text-turmeric-soft' : 'text-turmeric-deep dark:text-turmeric'}`}>{parsed.reply.name}</span>
              <span className={`block truncate ${mine ? 'text-[#efe9d2]/80' : 'text-charcoal-soft dark:text-glow-dim'}`}>{parsed.reply.excerpt || '…'}</span>
            </button>
          )}

          {/* media */}
          {msg.media_url && (
            <button onClick={() => onImageClick(msg.media_url!)} className="-mx-1 mb-1.5 block overflow-hidden rounded-xl">
              {!imgLoaded && <div className="grid h-44 w-64 max-w-full place-items-center bg-sand-200/60 dark:bg-midnight-700"><span className="h-6 w-6 animate-spin rounded-full border-2 border-copper border-t-transparent" /></div>}
              <img
                src={msg.media_url}
                alt="shared"
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`max-h-72 w-auto max-w-full rounded-xl transition-opacity ${imgLoaded ? 'opacity-100' : 'absolute opacity-0'}`}
              />
            </button>
          )}

          {/* content + time — rich text renders live, token by token, while streaming */}
          <div className="flex flex-wrap items-end gap-x-2.5">
            {(parsed.text || msg.streaming) && (
              <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.55]">
                <RichText text={msg.streaming ? streamSafe(parsed.text) : parsed.text} />
                {msg.streaming && <span className="blink-cursor" aria-hidden />}
              </p>
            )}
            <span className={`ml-auto inline-flex translate-y-[3px] items-center gap-1 pl-2 text-[10.5px] tabular-nums ${mine ? 'text-[#efe9d2]/70' : 'text-charcoal-mute dark:text-glow-dim/70'}`}>
              {parsed.edited && <span className="font-serif italic opacity-80">edited</span>}
              {parsed.viaSnehra && (
                <span className="inline-flex items-center gap-0.5 font-serif italic"><Sparkles size={9} /> via Snehra</span>
              )}
              {msg.failed && (
                <button onClick={() => onRetry(msg)} className="mr-0.5 inline-flex items-center gap-1 text-red-600 dark:text-red-400" title="Lost in the ether — tap to resend">
                  <AlertCircle size={12} /> <RotateCcw size={10} />
                </button>
              )}
              {!msg.streaming && shortTime(msg.created_at)}
              {mine && !msg.streaming && <Ticks msg={msg} />}
              {msg.streaming && <span className="font-serif italic text-turmeric-deep dark:text-turmeric">composing</span>}
            </span>
          </div>
        </motion.div>

        {/* blessing pills — hang beneath the bubble */}
        {reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start pl-1'}`}>
            <AnimatePresence initial={false}>
              {reactions.map((g) => (
                <motion.button
                  key={g.emoji}
                  initial={{ scale: 0, y: -4 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -4 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 22 }}
                  whileTap={{ scale: 0.82 }}
                  onClick={() => onBless(g.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] shadow-soft transition ${
                    g.mine
                      ? 'border-turmeric bg-turmeric/20 font-semibold text-turmeric-deep dark:text-turmeric'
                      : 'border-copper/30 bg-cream text-charcoal-soft hover:border-turmeric/60 dark:border-midnight-600 dark:bg-midnight-800 dark:text-glow-dim'
                  }`}
                  aria-label={`Toggle blessing ${g.emoji}`}
                >
                  <span>{g.emoji}</span>
                  <span className="tabular-nums font-mono text-[10px]">{g.count}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Ticks({ msg }: { msg: UiMessage }) {
  if (msg.pending) {
    return (
      <motion.span animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.3, repeat: Infinity }}>
        <Check size={13} className="text-copper-soft" />
      </motion.span>
    );
  }
  if (msg.failed) return null;
  if (msg.is_read) return <CheckCheck size={13} className="text-turmeric drop-shadow-[0_0_4px_rgba(240,185,11,0.6)]" />;
  return <Check size={13} className="opacity-70" />;
}

export { AnimatePresence };
