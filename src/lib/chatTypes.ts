export interface UserStatus {
  emoji: string;
  text: string;
}

export interface ChatUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  last_seen: string;
  phone_number?: string;
  status?: UserStatus | null;
}

export interface ChatMemberRecord {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user: ChatUser;
}

export interface MessageRecord {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  is_read: boolean;
  created_at: string;
  users?: ChatUser;
}

/** Optimistic envelope layered on a message inside the UI. */
export type UiMessage = MessageRecord & { pending?: boolean; failed?: boolean; streaming?: boolean };

export interface LastMessageBrief {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  is_read: boolean;
}

export type ChatKind = 'direct' | 'group' | 'channel';

export interface ChatSummary {
  id: string;
  type: ChatKind;
  name: string | null;
  title: string;
  avatar_url: string | null;
  other_user: ChatUser | null;
  members: ChatMemberRecord[];
  my_role: 'owner' | 'admin' | 'member';
  last_message: LastMessageBrief | null;
  unread: number;
  is_bhandar: boolean;
  is_snehra?: boolean;
  created_at: string;
}

export interface BootstrapPayload {
  me: ChatUser;
  chats: ChatSummary[];
}

export interface MessagesPage {
  data: UiMessage[];
  nextCursor: string | null;
}

/* ── Presence helpers ─────────────────────────────────────────── */
export type PresenceState = 'online' | 'recently' | 'away';

export function presenceOf(lastSeen?: string | null): PresenceState {
  if (!lastSeen) return 'away';
  const ms = Date.now() - new Date(lastSeen).getTime();
  if (ms < 75_000) return 'online';
  if (ms < 3 * 3600_000) return 'recently';
  return 'away';
}

export function presenceLabel(lastSeen?: string | null): string {
  if (!lastSeen) return 'unseen in an age';
  const ms = Date.now() - new Date(lastSeen).getTime();
  if (ms < 75_000) return 'online';
  if (ms < 3 * 3600_000) return 'seen recently';
  const d = new Date(lastSeen);
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return `seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (days < 2) return `seen yesterday`;
  return `seen ${days} days ago`;
}

export function chatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
