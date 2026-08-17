import supabase from '../db-client.js';

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  return user;
}

export async function isMember(chatId, userId) {
  const { data } = await supabase
    .from('chat_members')
    .select('role')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.role || null;
}

export function deriveTitle(chat, members, meId) {
  const others = members.filter((m) => m.user_id !== meId);
  if (chat.type === 'direct') {
    if (others.length === 0) return 'Bhandar · Saved Messages';
    const o = others[0]?.user;
    return o?.display_name || o?.username || 'Sakhi';
  }
  return chat.name || 'Unnamed Sangha';
}

/** Attach .user profiles onto message rows without FK embeds. */
export async function attachSenders(rows) {
  const ids = [...new Set((rows || []).map((r) => r.sender_id))];
  if (!ids.length) return rows || [];
  const { data: users } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, last_seen, phone_number')
    .in('id', ids);
  const map = {};
  for (const u of users || []) map[u.id] = u;
  return (rows || []).map((r) => ({ ...r, users: map[r.sender_id] || null }));
}
