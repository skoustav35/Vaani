import { ArrowLeft, Info, Megaphone, Search, Sparkles, Users } from 'lucide-react';
import type { ChatSummary, ChatUser } from '../lib/chatTypes';
import { presenceLabel } from '../lib/chatTypes';
import Avatar from './Avatar';
import { useChatUI } from '../store/chatStore';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  chat: ChatSummary;
  me: ChatUser;
  onToggleSearch: () => void;
  searchOpen: boolean;
}

export default function ChatHeader({ chat, onToggleSearch, searchOpen }: Props) {
  const closeChat = useChatUI((s) => s.closeChat);
  const toggleInfo = useChatUI((s) => s.toggleInfo);
  const typingEntry = useChatUI((s) => s.typing[chat.id]);
  const someoneTyping = !!typingEntry && typingEntry.until > Date.now();

  const otStatus = chat.other_user?.status;
  const subtitle = chat.is_snehra
    ? 'Snehra-6.7-Ultra · crafted locally, awake always'
    : chat.is_bhandar
      ? 'your private storeroom'
      : chat.type === 'direct'
        ? [presenceLabel(chat.other_user?.last_seen), otStatus ? `${otStatus.emoji} ${otStatus.text || 'in quiet practice'}` : null].filter(Boolean).join(' · ')
        : chat.type === 'channel'
          ? `${chat.members.length} listeners · Sangha`
          : chat.members.length + ' members';

  return (
    <header className="border-b copper-rule bg-cream/90 backdrop-blur-sm dark:bg-midnight-800/90">
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <button
          onClick={closeChat}
          className="grid h-9 w-9 place-items-center rounded-full text-charcoal-soft transition hover:bg-sand-200 lg:hidden dark:text-glow dark:hover:bg-midnight-700"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={19} />
        </button>

        <button onClick={toggleInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="relative">
            {chat.is_snehra ? (
              <div className="grid h-[42px] w-[42px] place-items-center rounded-full bg-gradient-to-br from-turmeric via-copper to-neem p-[2.5px] shadow-turmeric">
                <span className="grid h-full w-full place-items-center rounded-full bg-cream dark:bg-midnight-800">
                  <Sparkles size={19} className="text-turmeric-deep dark:text-turmeric" />
                </span>
              </div>
            ) : chat.type === 'direct' && !chat.is_bhandar && chat.other_user ? (
              <span
                role="button"
                tabIndex={0}
                className="block cursor-pointer transition hover:scale-105"
                onClick={(e) => { e.stopPropagation(); useChatUI.getState().viewProfile(chat.other_user!.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); useChatUI.getState().viewProfile(chat.other_user!.id); } }}
                title="View their visiting card"
              >
                <Avatar src={chat.other_user.avatar_url ?? chat.avatar_url} name={chat.title} size={42} lastSeen={chat.other_user.last_seen} />
              </span>
            ) : (
              <Avatar
                src={null}
                name={chat.title}
                size={42}
              />
            )}
            {chat.type !== 'direct' && (
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-turmeric text-charcoal shadow-soft">
                {chat.type === 'channel' ? <Megaphone size={10.5} /> : <Users size={10.5} />}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-[17px] leading-tight text-neem-deep dark:text-glow">{chat.title}</h2>
            <AnimatePresence mode="wait">
              {someoneTyping ? (
                <motion.p
                  key="typing"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[12px] font-medium italic text-turmeric-deep dark:text-turmeric"
                >
                  {typingEntry!.name} is composing…
                </motion.p>
              ) : (
                <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`truncate text-[12px] ${chat.is_snehra ? 'font-medium text-turmeric-deep dark:text-turmeric' : 'text-charcoal-mute dark:text-glow-dim/80'}`}>
                  {subtitle}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </button>

        <button
          onClick={onToggleSearch}
          className={`grid h-9 w-9 place-items-center rounded-full transition hover:bg-turmeric/15 ${searchOpen ? 'bg-turmeric/20 text-turmeric-deep dark:text-turmeric' : 'text-copper dark:text-glow'}`}
          aria-label="Search within thread"
        >
          <Search size={17} />
        </button>
        <button
          onClick={toggleInfo}
          className="grid h-9 w-9 place-items-center rounded-full text-copper transition hover:bg-turmeric/15 hover:text-copper-deep dark:text-glow dark:hover:bg-midnight-700"
          aria-label="Conversation details"
        >
          <Info size={18} />
        </button>
      </div>

      {/* Snehra ribbon */}
      {chat.is_snehra && (
        <div className="flex items-center justify-center gap-2 border-t border-turmeric/30 bg-gradient-to-r from-turmeric/10 via-turmeric/5 to-transparent px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-neem-loud animate-breathe" />
          <p className="font-serif text-[10.5px] tracking-wide text-charcoal-soft dark:text-glow-dim">
            Snehra answers and <span className="text-turmeric-deep dark:text-turmeric">acts</span> — she can kindle circles, carry messages, re-carve and remove.
          </p>
        </div>
      )}
    </header>
  );
}
