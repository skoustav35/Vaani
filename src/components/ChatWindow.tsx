import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import type { ChatSummary, ChatUser, UiMessage } from '../lib/chatTypes';
import { useMessages, appendMessage, removeMessage, patchMessage, reconcileTemp } from '../hooks/useMessages';
import { useExtras } from '../hooks/useExtras';
import type { ListHandle } from './MessageList';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import PinBar from './PinBar';
import ComposeBox, { type ComposeContext } from './ComposeBox';
import TypingDots from './TypingDots';
import MediaLightbox from './MediaLightbox';
import InfoPanel from './InfoPanel';
import MessageMenu, { type MenuAction } from './MessageMenu';
import EditStudio from './EditStudio';
import { useChatUI } from '../store/chatStore';
import { apiFetch, apiStream } from '../lib/api';
import { buildForward, buildReply, oneLineExcerpt, parseContent, type ReplyRef } from '../lib/markers';

const SNEHRA_ID = '77777777-7777-4777-8777-777777777777';
const SNEHRA_META: ChatUser = {
  id: SNEHRA_ID,
  username: 'snehra_ai',
  display_name: 'Snehra',
  avatar_url: 'https://api.dicebear.com/9.x/personas/svg?seed=SnehraAI',
  last_seen: new Date().toISOString(),
};

interface Props {
  chat: ChatSummary;
  me: ChatUser;
  bhandarId: string | null;
}

export default function ChatWindow({ chat, me, bhandarId }: Props) {
  const qc = useQueryClient();
  const { query, send, sendTyping } = useMessages(chat.id, me);
  const extras = useExtras(chat.id);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [menuMsg, setMenuMsg] = useState<UiMessage | null>(null);
  const [composeCtx, setComposeCtx] = useState<ComposeContext>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchIdx, setSearchIdx] = useState(0);
  const [snehraThinking, setSnehraThinking] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [studioMsg, setStudioMsg] = useState<UiMessage | null>(null);
  const listHandle = useRef<ListHandle | null>(null);

  const infoOpen = useChatUI((s) => s.infoOpen);
  const typingEntry = useChatUI((s) => s.typing[chat.id]);
  const askForward = useChatUI((s) => s.askForward);
  const showToast = useChatUI((s) => s.showToast);
  const someoneTyping = (!!typingEntry && typingEntry.until > Date.now()) || snehraThinking;

  const canManage = (chat.my_role === 'owner' || chat.my_role === 'admin') && chat.type !== 'direct';

  const messages = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const seen = new Set<string>();
    const out: UiMessage[] = [];
    for (const page of pages) {
      for (const m of page.data) {
        if (hiddenIds.has(m.id)) continue;
        if (!seen.has(m.id)) { seen.add(m.id); out.push(m); }
      }
    }
    return out;
  }, [query.data, hiddenIds]);

  /* read on open + reset local veils */
  useEffect(() => {
    apiFetch('/api/chat/read', { method: 'POST', body: JSON.stringify({ chat_id: chat.id }) })
      .then(() => qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] }))
      .catch(() => undefined);
    setComposeCtx(null);
    setSearchOpen(false);
    setSearchTerm('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  /* snehra thinking pulses */
  useEffect(() => {
    if (!snehraThinking) return;
    useChatUI.getState().setTyping(chat.id, 'Snehra');
    const t = setInterval(() => useChatUI.getState().setTyping(chat.id, 'Snehra'), 1200);
    return () => clearInterval(t);
  }, [snehraThinking, chat.id]);

  const retry = (msg: UiMessage) => {
    removeMessage(qc, chat.id, msg.id);
    send(msg.content || '', msg.media_url).catch(() => undefined);
  };

  /* ── Snehra's live stream ── */
  const snehraSend = async (content: string) => {
    const tempUser: UiMessage = {
      id: `tmp-${Date.now()}`,
      chat_id: chat.id,
      sender_id: me.id,
      content,
      media_url: null,
      is_read: true,
      created_at: new Date().toISOString(),
      users: me,
      pending: true,
    };
    appendMessage(qc, chat.id, tempUser);

    const tempBotId = `tmp-snh-${Date.now()}`;
    appendMessage(qc, chat.id, {
      id: tempBotId,
      chat_id: chat.id,
      sender_id: SNEHRA_ID,
      content: '',
      media_url: null,
      is_read: true,
      created_at: new Date().toISOString(),
      users: SNEHRA_META,
      streaming: true,
    });
    requestAnimationFrame(() => listHandle.current?.toBottom());
    setSnehraThinking(true);

    let target = '';
    let shown = '';
    let finalized = false;
    let lastScroll = 0;
    const followScroll = () => {
      const now = Date.now();
      if (now - lastScroll > 240) { lastScroll = now; listHandle.current?.toBottom(); }
    };
    let finalMsg: UiMessage | null = null;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const settleFinal = () => {
      clearInterval(reveal);
      if (safety) clearTimeout(safety);
      removeMessage(qc, chat.id, tempBotId);
      if (finalMsg) {
        appendMessage(qc, chat.id, { ...finalMsg, users: SNEHRA_META });
      } else if (target) {
        appendMessage(qc, chat.id, {
          id: `local-${Date.now()}`,
          chat_id: chat.id,
          sender_id: SNEHRA_ID,
          content: target,
          media_url: null,
          is_read: true,
          created_at: new Date().toISOString(),
          users: SNEHRA_META,
        });
      }
      qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      requestAnimationFrame(() => listHandle.current?.toBottom());
    };
    const reveal = setInterval(() => {
      if (shown.length < target.length) {
        const step = Math.max(1, Math.ceil(target.length * 0.016));
        shown = target.slice(0, Math.min(target.length, shown.length + step));
        patchMessage(qc, chat.id, tempBotId, { content: shown });
        followScroll();
        return;
      }
      if (finalized) settleFinal();
    }, 30);

    try {
      await apiStream('/api/chat/snehra', { content }, (frame) => {
        const type = frame.type as string | undefined;
        if (type === 'meta' && frame.user_message) {
          reconcileTemp(qc, chat.id, { ...(frame.user_message as UiMessage), users: me }, me);
        } else if (type === 'delta') {
          const delta = String(frame.delta || '');
          if (delta) {
            target += delta;
            setSnehraThinking(false);
          }
        } else if (type === 'reset') {
          // she went to study the scrolls — a fresh leaf
          target = '';
          shown = '';
          patchMessage(qc, chat.id, tempBotId, { content: '' });
          setSnehraThinking(true);
        } else if (type === 'final') {
          finalMsg = (frame.message as UiMessage | undefined) ?? null;
          finalized = true;
          safety = setTimeout(settleFinal, 5000);
        }
      });
      if (!finalized) {
        finalized = true;
        safety = setTimeout(settleFinal, 700);
      }
    } catch (err) {
      clearInterval(reveal);
      if (safety) clearTimeout(safety);
      removeMessage(qc, chat.id, tempBotId);
      patchMessage(qc, chat.id, tempUser.id, { pending: false, failed: false });
      showToast(err instanceof Error ? err.message : 'Snehra could not be reached');
      throw err;
    } finally {
      setSnehraThinking(false);
    }
  };

  const smartSend = async (content: string, media: string | null) => {
    let body = content;
    if (composeCtx?.kind === 'reply') {
      body = buildReply(content, { id: composeCtx.id, name: composeCtx.name, excerpt: composeCtx.excerpt });
    }
    if (chat.is_snehra) {
      await snehraSend(body);
      return;
    }
    await send(body, media);
    requestAnimationFrame(() => listHandle.current?.toBottom());
  };

  const editSend = async (msgId: string, content: string) => {
    try {
      const updated = await apiFetch<UiMessage>('/api/chat/message-edit', {
        method: 'POST',
        body: JSON.stringify({ message_id: msgId, content }),
      });
      patchMessage(qc, chat.id, msgId, updated);
      showToast('The words were re-carved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'The chisel slipped');
      throw err;
    }
  };

  /* ── two-tier deletion ── */
  const deleteForEveryone = async (msg: UiMessage) => {
    removeMessage(qc, chat.id, msg.id);
    setMenuMsg(null);
    // the ridge-rail lets go optimistically too
    qc.setQueryData(['vaani', 'extras', chat.id], (old: { pins?: UiMessage[]; reactions?: unknown } | undefined) =>
      old?.pins ? { ...old, pins: old.pins.filter((p) => p.id !== msg.id) } : old
    );
    try {
      await apiFetch('/api/chat/message-delete', { method: 'POST', body: JSON.stringify({ message_id: msg.id, scope: 'everyone' }) });
      extras.refresh();
      qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      showToast('Carried away — from every scroll');
    } catch (err) {
      query.refetch();
      showToast(err instanceof Error ? err.message : 'The wind refused');
    }
  };

  const deleteForMe = async (msg: UiMessage) => {
    const id = msg.id;
    removeMessage(qc, chat.id, id);
    setHiddenIds((s) => new Set(s).add(id));
    setMenuMsg(null);
    try {
      await apiFetch('/api/chat/message-delete', { method: 'POST', body: JSON.stringify({ message_id: id, scope: 'me' }) });
      extras.refresh();
      showToast('Veiled from your scroll alone');
      qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
    } catch (err) {
      setHiddenIds((s) => { const n = new Set(s); n.delete(id); return n; });
      query.refetch();
      showToast(err instanceof Error ? err.message : 'The veil would not fall');
    }
  };

  const keepInBhandar = async (msg: UiMessage) => {
    if (!bhandarId) return;
    setMenuMsg(null);
    const parsed = parseContent(msg.content);
    try {
      await apiFetch('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ chat_id: bhandarId, content: buildForward(parsed.text, chat.title), media_url: msg.media_url }),
      });
      showToast('Kept safe in your Bhandar');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not keep it');
    }
  };

  const doBless = useCallback(
    (msg: UiMessage, emoji = '❤️') => {
      extras.bless(msg.id, emoji);
      setMenuMsg(null);
    },
    [extras, chat.id]
  );

  const onAction = useCallback(
    (action: MenuAction, msg: UiMessage) => {
      const parsed = parseContent(msg.content);
      const mine = msg.sender_id === me.id;
      const senderName = mine ? 'You' : msg.users?.display_name || 'A sakhi';

      switch (action) {
        case 'menu': setMenuMsg(msg); break;
        case 'deletePrompt': setMenuMsg(msg); break;
        case 'reply':
          setComposeCtx({ kind: 'reply', id: msg.id, name: senderName, excerpt: parsed.text ? oneLineExcerpt(parsed.text) : '📷 an image' });
          break;
        case 'bless': doBless(msg); setMenuMsg(null); break;
        case 'copy':
          if (parsed.text) {
            navigator.clipboard.writeText(parsed.text).then(
              () => showToast('Words copied to palm leaf'),
              () => showToast(parsed.text)
            );
          }
          setMenuMsg(null);
          break;
        case 'forward':
          askForward(msg.id, parsed.text, msg.media_url);
          setMenuMsg(null);
          break;
        case 'bhandar': keepInBhandar(msg); break;
        case 'pin':
          (async () => {
            try {
              const here = extras.data?.pins?.some((p) => p.id === msg.id);
              if (here) { await extras.unpin(msg.id); showToast('Lifted from the ridge'); }
              else { await extras.pin(msg.id); showToast('Pinned to the ridge top'); }
            } catch (err) { showToast(err instanceof Error ? err.message : 'The pin would not hold'); }
            setMenuMsg(null);
          })();
          break;
        case 'edit':
          if (mine) setComposeCtx({ kind: 'edit', msg });
          setMenuMsg(null);
          break;
        case 'studio':
          if (mine) setStudioMsg(msg);
          setMenuMsg(null);
          break;
        case 'deleteMe': deleteForMe(msg); break;
        case 'delete': deleteForEveryone(msg); break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me.id, chat.id, bhandarId, extras]
  );

  /* in-chat search */
  const matches = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return [];
    return messages.filter((m) => (parseContent(m.content).text || '').toLowerCase().includes(t)).map((m) => m.id);
  }, [messages, searchTerm]);

  useEffect(() => { setSearchIdx(0); }, [searchTerm]);

  const gotoMatch = (dir: 1 | -1) => {
    if (!matches.length) return;
    const next = (searchIdx + dir + matches.length) % matches.length;
    setSearchIdx(next);
    listHandle.current?.jumpTo(matches[next]);
  };

  const highlightedId = searchOpen && matches.length ? matches[searchIdx] : null;

  const olderCursor = query.data?.pages?.[0]?.nextCursor;

  const reactionListFor = (id: string) => {
    const m = extras.data?.reactions?.[id];
    if (!m) return [];
    return Object.entries(m).map(([emoji, g]) => ({ emoji, count: g.count, mine: g.mine }));
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader chat={chat} me={me} onToggleSearch={() => { setSearchOpen((v) => !v); setSearchTerm(''); }} searchOpen={searchOpen} />

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              className="overflow-hidden border-b copper-rule bg-cream/90 backdrop-blur-sm dark:bg-midnight-800/90"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Search size={14} className="text-copper" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') gotoMatch(1); }}
                  placeholder="Search within this thread…"
                  className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-charcoal placeholder:text-charcoal-mute/60 focus:outline-none dark:text-[#efe6d2]"
                />
                {searchTerm && (
                  <span className="tabular-nums font-mono text-[10.5px] text-charcoal-mute dark:text-glow-dim">
                    {matches.length ? `${searchIdx + 1}/${matches.length}` : '0'} matches
                  </span>
                )}
                <button onClick={() => gotoMatch(1)} className="rounded-md px-2 py-1 font-serif text-[11px] text-copper hover:bg-turmeric/15">next</button>
                <button onClick={() => gotoMatch(-1)} className="rounded-md px-2 py-1 font-serif text-[11px] text-copper hover:bg-turmeric/15">prev</button>
                <button onClick={() => { setSearchOpen(false); setSearchTerm(''); }} aria-label="Close search" className="grid h-7 w-7 place-items-center rounded-full text-charcoal-mute hover:bg-turmeric/15"><X size={13} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="chat-weave relative flex min-h-0 flex-1 flex-col">
          <PinBar
            pins={extras.data?.pins ?? []}
            meId={me.id}
            canManage={canManage}
            onJump={(id) => listHandle.current?.jumpTo(id)}
            onUnpin={async (id) => { try { await extras.unpin(id); showToast('Lifted from the ridge'); } catch { showToast('The pin would not lift'); } }}
          />

          <MessageList
            messages={messages}
            meId={me.id}
            showSenderNames={chat.type !== 'direct'}
            canManage={canManage}
            hasOlder={!!olderCursor}
            fetchingOlder={query.isFetchingNextPage}
            fetchOlder={() => query.fetchNextPage()}
            isLoading={query.isLoading}
            onImageClick={setLightbox}
            onRetry={retry}
            onAction={onAction}
            handle={listHandle}
            highlightedId={highlightedId}
            isSnehra={!!chat.is_snehra}
            reactions={extras.data?.reactions ?? {}}
            onBless={(id, emoji) => extras.bless(id, emoji)}
          />

          {/* in-flow composing leaf — never painted over the messages */}
          <AnimatePresence>
            {someoneTyping && (
              <motion.div
                key="typing-strip"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className="overflow-hidden px-3 sm:px-6"
              >
                <div className="pb-2.5">
                  <TypingDots name={snehraThinking ? 'Snehra · Snehra-6.7-Ultra' : typingEntry!.name} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ComposeBox
          chat={chat}
          context={composeCtx}
          onClearContext={() => setComposeCtx(null)}
          onTyping={sendTyping}
          onSend={smartSend}
          onEditSend={editSend}
          onFocusInput={() => {
            // embrace of the keypad: keep the newest words in sight
            setTimeout(() => listHandle.current?.toBottom(), 120);
            setTimeout(() => listHandle.current?.toBottom(), 380);
          }}
        />
      </section>

      <AnimatePresence>{infoOpen && <InfoPanel key="info" chat={chat} />}</AnimatePresence>
      <AnimatePresence>{lightbox && <MediaLightbox key="lightbox" url={lightbox} onClose={() => setLightbox(null)} />}</AnimatePresence>
      <EditStudio
        target={studioMsg ? { msg: studioMsg } : null}
        onClose={() => setStudioMsg(null)}
        onApply={async (msgId, content) => { await editSend(msgId, content); }}
      />
      <MessageMenu
        msg={menuMsg}
        mine={menuMsg?.sender_id === me.id}
        canDelete={!!menuMsg && (menuMsg.sender_id === me.id || canManage)}
        blessed={!!menuMsg && !!extras.data?.reactions?.[menuMsg.id]?.['❤️']?.mine}
        pinnedHere={!!menuMsg && !!extras.data?.pins?.some((p) => p.id === menuMsg.id)}
        onClose={() => setMenuMsg(null)}
        onAction={onAction}
      />
    </div>
  );
}

export type { ReplyRef };
