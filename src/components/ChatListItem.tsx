import { motion } from 'framer-motion';
import { Archive, Check, CheckCheck, Lock, Megaphone, Pin, Sparkles, Users } from 'lucide-react';
import type { ChatSummary, ChatUser } from '../lib/chatTypes';
import { presenceOf } from '../lib/chatTypes';
import { parseContent } from '../lib/markers';
import Avatar from './Avatar';
import { useChatUI } from '../store/chatStore';

function briefTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ChatListItem({ chat, me, active }: { chat: ChatSummary; me: ChatUser; active: boolean }) {
  const openChat = useChatUI((s) => s.openChat);
  const typingEntry = useChatUI((s) => s.typing[chat.id]);
  const Locked = useChatUI((s) => s.locked.includes(chat.id));
  const unlocked = useChatUI((s) => s.unlocked.includes(chat.id));
  const pinned = useChatUI((s) => s.pinned.includes(chat.id));
  const askLockPin = useChatUI((s) => s.askLockPin);
  const someoneTyping = !!typingEntry && typingEntry.until > Date.now();

  const lm = chat.last_message;
  const lmMine = lm?.sender_id === me.id;
  const presence = chat.type === 'direct' && !chat.is_bhandar && !chat.is_snehra ? presenceOf(chat.other_user?.last_seen) : null;
  const isLocked = Locked && !unlocked;

  const click = () => {
    if (isLocked) { askLockPin(chat.id); return; }
    openChat(chat.id);
  };

  const preview = isLocked ? (
    <span className="flex items-center gap-1.5 font-serif italic text-charcoal-mute dark:text-glow-dim/80">
      <Lock size={11} className="text-copper" /> sealed by your mantra
    </span>
  ) : someoneTyping ? (
    <span className="font-medium italic text-turmeric-deep dark:text-turmeric">composing…</span>
  ) : !lm ? (
    <span className="italic text-charcoal-mute">a silence awaits its first word</span>
  ) : (
    <>
      {lmMine && !chat.is_bhandar && (
        lm.is_read
          ? <CheckCheck size={14} className="mt-[1px] shrink-0 text-turmeric drop-shadow-[0_0_3px_rgba(240,185,11,0.5)]" />
          : <Check size={14} className="mt-[1px] shrink-0 text-charcoal-mute" />
      )}
      <span className="truncate">{parseContent(lm.content).text.replace(/[*_`]/g, '') || '📷 An image, kept'}</span>
    </>
  );

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={click}
      className={`group relative flex w-full items-center gap-3 border-l-[3px] px-3.5 py-3 text-left transition sm:px-4 ${
        active
          ? 'border-l-turmeric bg-gradient-to-r from-turmeric/15 to-transparent dark:from-turmeric/10'
          : 'border-l-transparent hover:bg-sand-200/60 dark:hover:bg-midnight-800/70'
      }`}
    >
      {chat.is_bhandar ? (
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-copper/50 bg-gradient-to-br from-turmeric-soft to-turmeric text-charcoal shadow-soft">
          <Archive size={20} />
        </div>
      ) : chat.is_snehra ? (
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-turmeric via-copper to-neem p-[2.5px] shadow-turmeric">
          <span className="grid h-full w-full place-items-center rounded-full bg-cream dark:bg-midnight-800">
            <Sparkles size={20} className="text-turmeric-deep dark:text-turmeric" />
          </span>
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-cream bg-neem-loud animate-breathe dark:border-midnight-900" />
        </div>
      ) : (
        <div className="relative">
          <Avatar
            src={chat.type === 'direct' ? chat.other_user?.avatar_url ?? chat.avatar_url : null}
            name={chat.title}
            size={48}
            lastSeen={chat.type === 'direct' && !chat.is_bhandar ? chat.other_user?.last_seen : undefined}
          />
          {chat.type !== 'direct' && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-sandalwood bg-neem text-cream dark:border-midnight-900">
              {chat.type === 'channel' ? <Megaphone size={9} /> : <Users size={9} />}
            </span>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={`flex min-w-0 items-center gap-1.5 truncate font-serif text-[15.5px] leading-snug ${active ? 'text-neem-deep dark:text-glow' : 'text-charcoal dark:text-[#efe6d2]'}`}>
            <span className="truncate">{chat.title}</span>
            {chat.type === 'direct' && !chat.is_bhandar && !chat.is_snehra && chat.other_user?.status && (
              <span className="shrink-0 text-[12px]" title={chat.other_user.status.text || 'present wind'}>{chat.other_user.status.emoji}</span>
            )}
            {pinned && <Pin size={11} className="shrink-0 rotate-45 text-copper" />}
            {Locked && <Lock size={11} className="shrink-0 text-turmeric-deep dark:text-turmeric" />}
          </h3>
          <span className={`shrink-0 text-[10.5px] tabular-nums ${chat.unread > 0 ? 'font-bold text-turmeric-deep dark:text-turmeric' : 'text-charcoal-mute dark:text-glow-dim/70'}`}>
            {briefTime(lm?.created_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 text-[12.5px] text-charcoal-soft dark:text-glow-dim">{preview}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {presence === 'online' && chat.unread === 0 && (
              <span className="h-2 w-2 rounded-full bg-neem-loud animate-breathe" title="online" />
            )}
            {chat.unread > 0 && !isLocked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="grid min-w-[20px] place-items-center rounded-full bg-turmeric px-1.5 py-[2px] text-[10.5px] font-bold text-charcoal shadow-turmeric"
              >
                {chat.unread > 99 ? '99+' : chat.unread}
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
