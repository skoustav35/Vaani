import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { UiMessage } from '../lib/chatTypes';

export interface ReactionGroup { count: number; mine: boolean }
export type ReactionMap = Record<string, Record<string, ReactionGroup>>;

export interface ExtrasPayload {
  pins: UiMessage[];
  reactions: ReactionMap;
}

export function useExtras(chatId: string | null) {
  const qc = useQueryClient();
  const key = ['vaani', 'extras', chatId] as const;

  const query = useQuery({
    queryKey: key,
    enabled: !!chatId,
    queryFn: () => apiFetch<ExtrasPayload>(`/api/chat/extras?chat_id=${chatId}`),
    refetchInterval: 12_000,
    staleTime: 5_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const bless = async (messageId: string, emoji = '❤️') => {
    const current = query.data?.reactions?.[messageId]?.[emoji];
    const mine = !current?.mine;
    qc.setQueryData(key, (old: ExtrasPayload | undefined) => {
      if (!old) return old;
      const reactions = { ...old.reactions };
      const forMsg = { ...(reactions[messageId] || {}) };
      const g = forMsg[emoji] || { count: 0, mine: false };
      forMsg[emoji] = { count: Math.max(0, g.count + (mine ? 1 : -1)), mine };
      if (forMsg[emoji].count === 0) delete forMsg[emoji];
      reactions[messageId] = forMsg;
      return { ...old, reactions };
    });
    try {
      await apiFetch('/api/chat/extras', { method: 'POST', body: JSON.stringify({ op: 'react', chat_id: chatId, message_id: messageId, emoji }) });
      refresh();
    } catch {
      refresh();
    }
  };

  const pin = async (messageId: string) => {
    await apiFetch('/api/chat/extras', { method: 'POST', body: JSON.stringify({ op: 'pin', chat_id: chatId, message_id: messageId }) });
    refresh();
  };

  const unpin = async (messageId: string) => {
    await apiFetch('/api/chat/extras', { method: 'POST', body: JSON.stringify({ op: 'unpin', chat_id: chatId, message_id: messageId }) });
    refresh();
  };

  return { ...query, bless, pin, unpin, refresh };
}
