import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, Megaphone, Pin, PinOff, Lock, LockOpen, DoorOpen, Trash2, Scroll, Users, X, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ChatMemberRecord, ChatSummary, BootstrapPayload } from '../lib/chatTypes';
import { presenceLabel, presenceOf } from '../lib/chatTypes';
import Avatar from './Avatar';
import MandalaSpinner from './MandalaSpinner';
import { useChatUI, getMantra } from '../store/chatStore';
import { useIsMobile } from '../hooks/useMediaQuery';

interface ChatDetail {
  chat: { id: string; type: string; name: string | null; created_at: string };
  members: ChatMemberRecord[];
  my_role: string;
}

export default function InfoPanel({ chat }: { chat: ChatSummary }) {
  const toggleInfo = useChatUI((s) => s.toggleInfo);
  const isMobileLayout = useIsMobile();
  const qc = useQueryClient();
  const togglePin = useChatUI((s) => s.togglePin);
  const pinned = useChatUI((s) => s.pinned.includes(chat.id));
  const locked = useChatUI((s) => s.locked.includes(chat.id));
  const lockChat = useChatUI((s) => s.lockChat);
  const askLockPin = useChatUI((s) => s.askLockPin);
  const closeChat = useChatUI((s) => s.closeChat);
  const showToast = useChatUI((s) => s.showToast);
  const [governing, setGoverning] = useState(false);

  const meId = (qc.getQueryData(['vaani', 'bootstrap']) as BootstrapPayload | undefined)?.me.id || '';

  const { data, isLoading } = useQuery({
    queryKey: ['vaani', 'chat', chat.id],
    queryFn: () => apiFetch<ChatDetail>(`/api/chat/chats?id=${chat.id}`),
    refetchInterval: 15_000,
  });
  const members = data?.members ?? chat.members;

  const onLock = () => {
    if (locked) { lockChat(chat.id); showToast('The seal is lifted'); return; }
    if (!getMantra(meId)) { askLockPin(chat.id); return; }
    lockChat(chat.id);
    showToast('Sealed behind your mantra');
  };

  const onLeave = async () => {
    if (governing) return;
    setGoverning(true);
    try {
      const r = await apiFetch<{ dissolved: boolean }>('/api/chat/chat-delete', {
        method: 'POST',
        body: JSON.stringify({ chat_id: chat.id }),
      });
      toggleInfo();
      closeChat();
      qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      showToast(r.dissolved ? 'The circle is dissolved into the winds' : 'You have stepped out of the thread');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not leave');
      setGoverning(false);
    }
  };

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b copper-rule px-4 py-3">
        <h3 className="font-serif text-[15px] tracking-wide text-copper dark:text-glow">
          {chat.type === 'channel' ? 'SANGHA PATRA' : chat.type === 'group' ? 'CIRCLE PATRA' : 'SAKHI PATRA'}
        </h3>
        <button onClick={toggleInfo} aria-label="Close details" className="grid h-8 w-8 place-items-center rounded-full text-charcoal-mute transition hover:bg-turmeric/15 hover:text-copper dark:hover:bg-midnight-700">
          <X size={16} />
        </button>
      </div>

      <div className="slim-scroll flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={chat.type === 'direct' ? chat.other_user?.avatar_url ?? chat.avatar_url : null}
            name={chat.title}
            size={84}
            lastSeen={chat.type === 'direct' && !chat.is_bhandar ? chat.other_user?.last_seen : undefined}
          />
          <h4 className="mt-3 font-serif text-xl text-neem-deep dark:text-glow">{chat.title}</h4>
          <p className="mt-1 text-[12.5px] text-charcoal-mute dark:text-glow-dim">
            {chat.is_bhandar
              ? 'Saved Messages — visible only to you'
              : chat.type === 'direct'
                ? `@${chat.other_user?.username} · ${presenceLabel(chat.other_user?.last_seen)}`
                : chat.type === 'channel'
                  ? 'A one-way river of wisdom. Only the Acharya posts.'
                  : `${members.length} souls in this circle`}
          </p>
          {chat.type === 'direct' && chat.other_user?.status && (
            <button
              onClick={() => useChatUI.getState().viewProfile(chat.other_user!.id)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-turmeric/45 bg-turmeric/10 px-3.5 py-1.5 text-[12px] text-charcoal-soft transition hover:shadow-turmeric dark:text-glow-dim"
            >
              {chat.other_user.status.emoji} {chat.other_user.status.text || 'in quiet practice'}
            </button>
          )}
          {chat.type === 'direct' && chat.other_user?.phone_number && (
            <p className="mt-1 rounded-full bg-sand-200 px-3 py-1 font-mono text-[11px] text-charcoal-soft dark:bg-midnight-700 dark:text-glow-dim">
              {chat.other_user.phone_number}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="mt-8 grid place-items-center"><MandalaSpinner size={38} /></div>
        ) : chat.type !== 'direct' && (
          <div className="mt-6">
            <p className="flex items-center gap-2 font-serif text-[12px] uppercase tracking-[0.18em] text-copper dark:text-glow-dim">
              <Users size={13} /> Members of the circle
            </p>
            <ul className="mt-3 space-y-1">
              {members.map((m) => {
                const p = presenceOf(m.user.last_seen);
                return (
                  <li
                    key={m.user_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => useChatUI.getState().viewProfile(m.user.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') useChatUI.getState().viewProfile(m.user.id); }}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-turmeric/10 hover:shadow-soft dark:hover:bg-midnight-700/60"
                  >
                    <Avatar src={m.user.avatar_url} name={m.user.display_name} size={36} lastSeen={m.user.last_seen} ring={false} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-charcoal dark:text-[#efe6d2]">
                        {m.user.display_name}
                        {m.user.status && <span className="text-[11px]" title={m.user.status.text}>{m.user.status.emoji}</span>}
                      </p>
                      <p className="truncate text-[11px] text-charcoal-mute dark:text-glow-dim">@{m.user.username} · {p === 'online' ? 'online' : presenceLabel(m.user.last_seen)}</p>
                    </div>
                    {m.role !== 'member' && (
                      <span className="flex items-center gap-1 rounded-full bg-turmeric/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-turmeric-deep dark:text-turmeric">
                        {m.role === 'owner' ? <Crown size={10} /> : <Scroll size={10} />}
                        {m.role === 'owner' ? (chat.type === 'channel' ? 'Acharya' : 'Owner') : 'Admin'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {chat.type === 'channel' && (
          <div className="mt-6 rounded-2xl border border-turmeric/40 bg-turmeric/10 p-4 dark:bg-turmeric/5">
            <p className="flex items-center gap-2 font-serif text-[13px] text-turmeric-deep dark:text-turmeric"><Megaphone size={14} /> Sangha dharma</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-charcoal-soft dark:text-glow-dim">
              Channels flow one way — from the Acharya to the listeners. Answers and offerings travel by direct message instead.
            </p>
          </div>
        )}

        {/* governance */}
        {!chat.is_bhandar && !chat.is_snehra && (
          <div className="mt-6 space-y-1.5">
            <p className="font-serif text-[12px] uppercase tracking-[0.18em] text-copper dark:text-glow-dim">Stewardship</p>
            <button
              onClick={() => { togglePin(chat.id); showToast(pinned ? 'Unpinned from the ridge' : 'Pinned to the ridge'); }}
              className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition hover:bg-turmeric/12 dark:hover:bg-midnight-700"
            >
              {pinned ? <PinOff size={16} className="text-copper dark:text-glow" /> : <Pin size={16} className="rotate-45 text-copper dark:text-glow" />}
              <span className="font-serif text-[14.5px] text-charcoal dark:text-[#efe6d2]">{pinned ? 'Unpin from the ridge' : 'Pin to the ridge'}</span>
            </button>
            <button
              onClick={onLock}
              className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition hover:bg-turmeric/12 dark:hover:bg-midnight-700"
            >
              {locked ? <LockOpen size={16} className="text-copper dark:text-glow" /> : <Lock size={16} className="text-copper dark:text-glow" />}
              <span className="font-serif text-[14.5px] text-charcoal dark:text-[#efe6d2]">{locked ? 'Lift the mantra seal' : 'Seal behind a mantra'}</span>
            </button>
            <button
              onClick={onLeave}
              disabled={governing}
              className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-red-700 transition hover:bg-red-900/10 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              {governing ? <Loader2 size={16} className="animate-spin" /> : (data?.my_role === 'owner' && chat.type !== 'direct' ? <Trash2 size={16} /> : <DoorOpen size={16} />)}
              <span className="font-serif text-[14.5px]">
                {data?.my_role === 'owner' && chat.type !== 'direct'
                  ? chat.type === 'channel' ? 'Dissolve the Sangha' : 'Dissolve the circle'
                  : chat.type === 'direct' ? 'Mute this thread away' : 'Leave the circle'}
              </span>
            </button>
            <p className="px-3.5 pt-1 text-[10.5px] leading-relaxed text-charcoal-mute/80 dark:text-glow-dim/60">
              Direct threads only part from your own view — the other sakhi keeps their scroll.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobileLayout) {
    return (
      <>
        <motion.div className="fixed inset-0 z-[60] bg-midnight-900/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleInfo} />
        <motion.aside
          initial={{ x: 320, opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 right-0 top-0 z-[61] w-[86vw] max-w-sm border-l copper-rule ayur-glass"
        >
          {body}
        </motion.aside>
      </>
    );
  }

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      className="hidden xl:block h-full shrink-0 overflow-hidden border-l copper-rule bg-cream/80 backdrop-blur-sm dark:bg-midnight-800/80"
    >
      {body}
    </motion.aside>
  );
}
