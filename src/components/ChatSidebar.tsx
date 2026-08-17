import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, SquarePen, Sun, Moon, ScrollText } from 'lucide-react';
import type { BootstrapPayload } from '../lib/chatTypes';
import ChatListItem from './ChatListItem';
import MandalaSpinner from './MandalaSpinner';
import VaaniMark from './VaaniMark';
import Avatar from './Avatar';
import { useChatUI } from '../store/chatStore';
import { useChatList, type ChatFilter } from '../hooks/useChatList';

const FILTERS: { id: ChatFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'direct', label: 'Sakhis' },
  { id: 'group', label: 'Circles' },
  { id: 'channel', label: 'Sanghas' },
];

interface Props {
  data: BootstrapPayload | undefined;
  isLoading: boolean;
}

export default function ChatSidebar({ data, isLoading }: Props) {
  const activeChatId = useChatUI((s) => s.activeChatId);
  const { newChatOpen, setNewChatOpen, setNiyamOpen, dark, toggleDark } = {
    newChatOpen: useChatUI((s) => s.newChatOpen),
    setNewChatOpen: useChatUI((s) => s.setNewChatOpen),
    setNiyamOpen: useChatUI((s) => s.setNiyamOpen),
    dark: useChatUI((s) => s.dark),
    toggleDark: useChatUI((s) => s.toggleDark),
  };
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [query, setQuery] = useState('');
  const pinned = useChatUI((s) => s.pinned);
  const openChat = useChatUI((s) => s.openChat);

  const allChats = useChatList(data?.chats ?? [], filter, query);
  // ordering: Bhandar → Snehra → pinned (then recent) → rest
  const chats = useMemo(() => {
    const base = [...allChats];
    base.sort((a, b) => {
      if (a.is_bhandar !== b.is_bhandar) return a.is_bhandar ? -1 : 1;
      if (!!a.is_snehra !== !!b.is_snehra) return a.is_snehra ? -1 : 1;
      const ap = pinned.includes(a.id), bp = pinned.includes(b.id);
      if (ap !== bp) return ap ? -1 : 1;
      return 0;
    });
    return base;
  }, [allChats, pinned]);
  const me = data?.me;

  const totalUnread = useMemo(() => (data?.chats ?? []).reduce((n, c) => n + (c.is_bhandar ? 0 : c.unread), 0), [data]);
  const snehraChat = data?.chats.find((c) => c.is_snehra);

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-r copper-rule bg-sandalwood dark:bg-midnight-900 lg:w-[360px] lg:shrink-0 xl:w-[400px]">
      {/* header */}
      <div className="border-b copper-rule px-4 pb-3" style={{ paddingTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.75rem))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VaaniMark size={40} />
            <div className="leading-none">
              <h1 className="font-serif text-[21px] text-neem-deep dark:text-glow">Vaani</h1>
              <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.3em] text-copper dark:text-glow-dim">the gentle messenger</p>
            </div>
            {totalUnread > 0 && (
              <span className="ml-1 grid min-w-[22px] place-items-center rounded-full bg-turmeric px-1.5 py-[3px] text-[10.5px] font-bold text-charcoal shadow-turmeric">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {snehraChat && (
              <motion.button
                onClick={() => openChat(snehraChat.id)}
                whileHover={{ scale: 1.08, rotate: -6 }}
                whileTap={{ scale: 0.9 }}
                className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-turmeric to-copper text-charcoal shadow-turmeric"
                aria-label="Talk to Snehra — the resident intelligence"
                title="Snehra · Snehra-6.7-Ultra"
              >
                <Sparkles size={16} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-sandalwood bg-neem-loud dark:border-midnight-900" />
              </motion.button>
            )}
            <button
              onClick={toggleDark}
              className="grid h-9 w-9 place-items-center rounded-full text-copper transition hover:bg-turmeric/15 dark:text-glow"
              aria-label={dark ? 'Dawn (light mode)' : 'Dusk (dark mode)'}
              title={dark ? 'Dawn awaits' : 'Call the dusk'}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setNewChatOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full text-copper transition hover:bg-turmeric/15 dark:text-glow"
              aria-label="New conversation"
              title="Kindle a new conversation"
            >
              <SquarePen size={17} />
            </button>
          </div>
        </div>

        {/* search */}
        <div className="relative mt-3.5">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sakhis, circles, words…"
            className="w-full rounded-full border border-copper/30 bg-cream py-2 pl-9 pr-4 text-[13px] text-charcoal shadow-inner placeholder:text-charcoal-mute/70 focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-800 dark:text-[#efe6d2] dark:placeholder:text-glow-dim/50"
          />
        </div>

        {/* filters */}
        <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 font-serif text-[11.5px] tracking-wide transition ${
                filter === f.id
                  ? 'border-neem bg-neem text-cream shadow-soft dark:border-turmeric dark:bg-turmeric dark:text-charcoal'
                  : 'border-copper/30 bg-transparent text-charcoal-soft hover:border-copper hover:text-copper-deep dark:border-midnight-600 dark:text-glow-dim dark:hover:border-midnight-600/80 hover:dark:bg-midnight-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="slim-scroll min-h-0 flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="grid place-items-center py-16"><MandalaSpinner size={46} label="Summoning the circles…" /></div>
        )}
        {!isLoading && chats.length === 0 && (
          <div className="px-6 py-14 text-center">
            <ScrollText size={30} className="mx-auto text-copper/50" />
            <p className="mt-3 font-serif text-[15px] text-charcoal-soft dark:text-glow-dim">Nothing answers this search.</p>
            <p className="mt-1 text-[12.5px] text-charcoal-mute">Kindle a new conversation with the quill above.</p>
          </div>
        )}
        {me && chats.map((c) => <ChatListItem key={c.id} chat={c} me={me} active={c.id === activeChatId} />)}
      </div>

      {/* footer / me */}
      {me && (
        <button
          onClick={() => setNiyamOpen(true)}
          className="flex items-center gap-3 border-t copper-rule px-4 py-3 text-left transition hover:bg-sand-200/70 dark:hover:bg-midnight-800"
        >
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); useChatUI.getState().viewProfile(me.id); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); useChatUI.getState().viewProfile(me.id); } }}
            title="Your visiting card"
            className="relative cursor-pointer transition hover:scale-105"
          >
            <Avatar src={me.avatar_url} name={me.display_name} size={40} lastSeen={me.last_seen} />
            {me.status && (
              <span className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full border border-cream bg-turmeric text-[10px] shadow-soft dark:border-midnight-900">
                {me.status.emoji}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-charcoal dark:text-[#efe6d2]">{me.display_name}</p>
            <p className="truncate text-[11px] text-charcoal-mute dark:text-glow-dim">
              {me.status?.text ? `${me.status.emoji} ${me.status.text} · Niyam` : `@${me.username} · Niyam`}
            </p>
          </div>
          <span className="rounded-full border border-copper/40 px-2.5 py-1 font-serif text-[10px] tracking-[0.14em] text-copper dark:border-midnight-600 dark:text-glow-dim">NIYAM</span>
        </button>
      )}
    </aside>
  );
}
