import { useMemo } from 'react';
import type { ChatSummary } from '../lib/chatTypes';

export type ChatFilter = 'all' | 'direct' | 'group' | 'channel';

export function useChatList(chats: ChatSummary[], filter: ChatFilter, query: string): ChatSummary[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats
      .filter((c) => (filter === 'all' ? true : c.type === filter))
      .filter((c) => {
        if (!q) return true;
        const inTitle = c.title.toLowerCase().includes(q);
        const inLast = (c.last_message?.content || '').toLowerCase().includes(q);
        const inMembers = c.members.some((m) => m.user.display_name.toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q));
        return inTitle || inLast || inMembers;
      });
  }, [chats, filter, query]);
}
