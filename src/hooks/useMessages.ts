import { useCallback, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import supabase from '../lib/supabase';
import { apiFetch } from '../lib/api';
import type { ChatUser, MessagesPage, UiMessage } from '../lib/chatTypes';
import { useChatUI } from '../store/chatStore';

export const KEY = (chatId: string) => ['vaani', 'messages', chatId] as const;

function pagesUpsert(pages: MessagesPage[], msg: UiMessage): MessagesPage[] {
  if (pages.length === 0) return [{ data: [msg], nextCursor: null }];
  const last = pages[pages.length - 1];
  return [...pages.slice(0, -1), { ...last, data: [...last.data, msg] }];
}

type CacheShape = { pages?: MessagesPage[]; pageParams?: unknown[] };

export function appendMessage(qc: ReturnType<typeof useQueryClient>, chatId: string, msg: UiMessage) {
  qc.setQueryData(KEY(chatId), (old: CacheShape | undefined) => {
    if (!old?.pages) return { pages: [{ data: [msg], nextCursor: null }], pageParams: [''] };
    if (old.pages.some((p) => p.data.some((m) => m.id === msg.id))) return old;
    return { ...old, pages: pagesUpsert(old.pages, msg) };
  });
}

export function removeMessage(qc: ReturnType<typeof useQueryClient>, chatId: string, id: string) {
  qc.setQueryData(KEY(chatId), (old: CacheShape | undefined) => {
    if (!old?.pages) return old;
    return { ...old, pages: old.pages.map((p) => ({ ...p, data: p.data.filter((m) => m.id !== id) })) };
  });
}

export function patchMessage(qc: ReturnType<typeof useQueryClient>, chatId: string, id: string, patch: Partial<UiMessage>) {
  qc.setQueryData(KEY(chatId), (old: CacheShape | undefined) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({ ...p, data: p.data.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
    };
  });
}

export function useMessages(chatId: string | null, me: ChatUser | undefined) {
  const qc = useQueryClient();
  const setTyping = useChatUI((s) => s.setTyping);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);

  const query = useInfiniteQuery({
    queryKey: KEY(chatId ?? 'none'),
    enabled: !!chatId,
    queryFn: ({ pageParam }) =>
      apiFetch<MessagesPage>(`/api/chat/messages?chat_id=${chatId}${pageParam ? `&before=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Safety-net cadence below Realtime; keeps edge cases (missed events) healed.
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  /* ── Realtime: live inserts/updates + typing broadcast ── */
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      const channel = supabase
        .channel(`vaani-room-${chatId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload) => {
            const row = payload.new as UiMessage;
            if (cancelled) return;
            qc.setQueryData(KEY(chatId), (old: { pages?: MessagesPage[]; pageParams?: unknown[] } | undefined) => {
              if (!old?.pages) return old;
              const all = old.pages.flatMap((p) => p.data);
              if (all.some((m) => m.id === row.id)) return old;
              // reconcile optimistic twin (my own pending bubble with same content)
              let pages = old.pages;
              if (me && row.sender_id === me.id) {
                pages = pages.map((p) => ({
                  ...p,
                  data: p.data.filter((m) => !(m.pending && m.sender_id === row.sender_id && m.content === row.content && m.media_url === row.media_url)),
                }));
              }
              return { ...old, pages: pagesUpsert(pages, row) };
            });
            qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
            if (me && row.sender_id !== me.id) {
              apiFetch('/api/chat/read', { method: 'POST', body: JSON.stringify({ chat_id: chatId }) }).catch(() => undefined);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload) => {
            const row = payload.new as UiMessage;
            if (cancelled) return;
            qc.setQueryData(KEY(chatId), (old: { pages?: MessagesPage[] } | undefined) => {
              if (!old?.pages) return old;
              return {
                ...old,
                pages: old.pages.map((p) => ({
                  ...p,
                  data: p.data.map((m) => (m.id === row.id ? { ...m, ...row } : m)),
                })),
              };
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload) => {
            if (cancelled) return;
            const oldRow = payload.old as { id?: string };
            if (oldRow?.id) removeMessage(qc, chatId, oldRow.id);
            qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          const name = (payload.payload as { name?: string; user?: string })?.name;
          const uid = (payload.payload as { user?: string })?.user;
          if (name && uid && uid !== me?.id?.toString()) setTyping(chatId, name);
        })
        .subscribe();

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, me?.id, qc, setTyping]);

  /* ── Typing broadcast (throttled) ── */
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1800) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user: me?.id, name: me?.display_name || 'Someone' },
    }).catch(() => undefined);
  }, [me]);

  /* ── Optimistic send ── */
  const send = useCallback(
    async (content: string, mediaUrl: string | null) => {
      if (!chatId || !me) return;
      const temp: UiMessage = {
        id: `tmp-${now2()}-${Math.random().toString(36).slice(2, 8)}`,
        chat_id: chatId,
        sender_id: me.id,
        content: content || null,
        media_url: mediaUrl,
        is_read: false,
        created_at: new Date().toISOString(),
        users: me,
        pending: true,
      };
      qc.setQueryData(KEY(chatId), (old: { pages?: MessagesPage[]; pageParams?: unknown[] } | undefined) => {
        if (!old?.pages) return { pages: [{ data: [temp], nextCursor: null }], pageParams: [''] };
        return { ...old, pages: pagesUpsert(old.pages, temp) };
      });

      try {
        const saved = await apiFetch<UiMessage>('/api/chat/messages', {
          method: 'POST',
          body: JSON.stringify({ chat_id: chatId, content, media_url: mediaUrl }),
        });
        qc.setQueryData(KEY(chatId), (old: { pages?: MessagesPage[] } | undefined) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              data: p.data.map((m) => (m.id === temp.id ? { ...saved, users: me } : m)),
            })),
          };
        });
        qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      } catch (err) {
        qc.setQueryData(KEY(chatId), (old: { pages?: MessagesPage[] } | undefined) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              data: p.data.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)),
            })),
          };
        });
        throw err;
      }
    },
    [chatId, me, qc]
  );

  return { query, send, sendTyping };
}

/** Reconcile a pending optimistic twin once the server copy exists. */
export function reconcileTemp(
  qc: ReturnType<typeof useQueryClient>,
  chatId: string,
  real: UiMessage,
  me: ChatUser | undefined
) {
  qc.setQueryData(KEY(chatId), (old: CacheShape | undefined) => {
    if (!old?.pages) return old;
    const all = old.pages.flatMap((p) => p.data);
    if (all.some((m) => m.id === real.id)) return old;
    let pages = old.pages;
    if (me && real.sender_id === me.id) {
      pages = pages.map((p) => ({
        ...p,
        data: p.data.filter((m) => !(m.pending && m.sender_id === real.sender_id && m.content === real.content && m.media_url === real.media_url)),
      }));
    }
    return { ...old, pages: pagesUpsert(pages, real) };
  });
}

function now2() { return Date.now(); }
