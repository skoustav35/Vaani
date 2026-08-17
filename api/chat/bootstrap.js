import supabase from '../db-client.js';
import { cors, requireUser, deriveTitle } from './_shared.js';

function avatarFor(email, name) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(email || name)}`;
}

async function ensureProfile(user) {
  const { data: existing } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  if (existing) return existing;

  const base = String(user.email || 'seeker').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  let username = base;
  for (let i = 0; i < 6; i++) {
    const { data: clash } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
    if (!clash) break;
    username = `${base}${Math.floor(Math.random() * 900 + 100)}`;
  }
  const profile = {
    id: user.id,
    username,
    phone_number: user.phone || `+91·${String(user.id).slice(0, 4)}`,
    display_name: user.user_metadata?.full_name || base.replace(/_/g, ' '),
    avatar_url: user.user_metadata?.avatar_url || avatarFor(user.email, base),
    last_seen: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('users').insert(profile).select().single();
  if (error) throw error;
  return data;
}

const SNEHRA_ID = '77777777-7777-4777-8777-777777777777';

async function ensureSnehra(userId, directChatIds) {
  if (directChatIds.length) {
    const { data: shared } = await supabase
      .from('chat_members')
      .select('chat_id')
      .in('chat_id', directChatIds)
      .eq('user_id', SNEHRA_ID)
      .limit(1);
    if (shared && shared[0]) return shared[0].chat_id;
  }
  const { data: chat, error } = await supabase.from('chats').insert({ id: crypto.randomUUID(), type: 'direct', name: null }).select().single();
  if (error) throw error;
  await supabase.from('chat_members').insert([
    { chat_id: chat.id, user_id: userId, role: 'owner' },
    { chat_id: chat.id, user_id: SNEHRA_ID, role: 'member' },
  ]);
  await supabase.from('messages').insert({
    id: crypto.randomUUID(),
    chat_id: chat.id,
    sender_id: SNEHRA_ID,
    content: 'Namaste. I am Snehra — woven from the same clay as this app, running as Snehra-6.7-Ultra, a locally-crafted model that lives inside Vaani itself.\n\nI can act, not only answer. Ask me to kindle a new circle, carry your words into another thread, re-carve a message, or carry one away. 🌿',
  });
  return chat.id;
}

async function ensureBhandar(userId, directChatIds) {
  if (directChatIds.length) {
    const { data: memberRows } = await supabase
      .from('chat_members')
      .select('chat_id')
      .in('chat_id', directChatIds);
    const counts = {};
    for (const r of memberRows || []) counts[r.chat_id] = (counts[r.chat_id] || 0) + 1;
    const solo = directChatIds.find((id) => counts[id] === 1);
    if (solo) return solo;
  }
  const { data: chat, error } = await supabase.from('chats').insert({ id: crypto.randomUUID(), type: 'direct', name: null }).select().single();
  if (error) throw error;
  await supabase.from('chat_members').insert({ chat_id: chat.id, user_id: userId, role: 'owner' });
  await supabase.from('messages').insert({
    id: crypto.randomUUID(),
    chat_id: chat.id,
    sender_id: userId,
    content: 'This is your Bhandar — a quiet storeroom for notes, shlokas and files. Only you can see what is kept here.',
  });
  return chat.id;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const me = await ensureProfile(user);

    // all memberships → my chats
    const { data: myMemberships, error: mErr } = await supabase
      .from('chat_members').select('chat_id, role').eq('user_id', user.id);
    if (mErr) throw mErr;
    let chatIds = (myMemberships || []).map((m) => m.chat_id);

    // ensure the Bhandar (saved messages) chat exists
    let chats = [];
    if (chatIds.length) {
      const { data } = await supabase.from('chats').select('*').in('id', chatIds);
      chats = data || [];
    }
    let directIds = chats.filter((c) => c.type === 'direct').map((c) => c.id);
    const snehraId = await ensureSnehra(user.id, directIds);
    if (!chatIds.includes(snehraId)) chatIds.push(snehraId);
    directIds = chats.filter((c) => c.type === 'direct').map((c) => c.id).concat(chatIds.includes(snehraId) ? [] : [snehraId]);
    const bhandarId = await ensureBhandar(user.id, directIds);
    if (!chatIds.includes(bhandarId)) chatIds.push(bhandarId);

    const { data: chatRows } = await supabase.from('chats').select('*').in('id', chatIds);
    chats = chatRows || [];

    // members → then their user profiles (explicit join; no FK reliance)
    const { data: memberRows } = await supabase
      .from('chat_members')
      .select('chat_id, user_id, role, joined_at')
      .in('chat_id', chatIds);
    const membersByChat = {};
    const memberIds = [];
    for (const r of memberRows || []) {
      (membersByChat[r.chat_id] = membersByChat[r.chat_id] || []).push(r);
      if (!memberIds.includes(r.user_id)) memberIds.push(r.user_id);
    }
    const { data: userRows } = memberIds.length
      ? await supabase.from('users').select('id, username, display_name, avatar_url, last_seen, phone_number').in('id', memberIds)
      : { data: [] };
    const usersById = {};
    for (const u of userRows || []) usersById[u.id] = u;

    // merge living statuses into every profile (me + members)
    const statusIds = [...new Set([...memberIds, user.id])];
    const { data: statusRows } = await supabase.from('user_status').select('*').in('user_id', statusIds.length ? statusIds : ['00000000-0000-0000-0000-000000000000']);
    const statusById = {};
    for (const s of statusRows || []) statusById[s.user_id] = { emoji: s.emoji, text: s.text };
    for (const u of Object.values(usersById)) Object.assign(u, { status: statusById[u.id] || null });
    if (statusById[me.id]) me.status = statusById[me.id];
    else me.status = null;

    for (const list of Object.values(membersByChat)) {
      for (const r of list) r.user = usersById[r.user_id] || null;
    }

    // my hidden (deleted-for-me) veils
    const { data: hiddenRows } = await supabase
      .from('hidden_messages')
      .select('message_id')
      .eq('user_id', user.id)
      .limit(2000);
    const veil = new Set((hiddenRows || []).map((h) => h.message_id));

    // last message per chat (bounded fetch, group client-side)
    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, content, media_url, created_at, is_read')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: false })
      .limit(Math.max(120, chatIds.length * 4));
    const lastByChat = {};
    for (const m of recentMsgs || []) {
      if (veil.has(m.id)) continue;
      if (!lastByChat[m.chat_id]) lastByChat[m.chat_id] = m;
    }

    // unread counts (messages from others, unread)
    const { data: unreadRows } = await supabase
      .from('messages')
      .select('chat_id, id')
      .in('chat_id', chatIds)
      .eq('is_read', false)
      .neq('sender_id', user.id)
      .limit(1000);
    const unreadByChat = {};
    for (const r of unreadRows || []) {
      if (veil.has(r.id) || veil.has(r.message_id)) continue;
      unreadByChat[r.chat_id] = (unreadByChat[r.chat_id] || 0) + 1;
    }

    const summaries = chats.map((c) => {
      const members = membersByChat[c.id] || [];
      const title = deriveTitle(c, members, user.id);
      const other = c.type === 'direct' ? members.find((m) => m.user_id !== user.id)?.user || null : null;
      const isSnehra = c.type === 'direct' && members.some((m) => m.user && m.user.username === 'snehra_ai');
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        title,
        other_user: other,
        avatar_url: c.type === 'direct' ? (other?.avatar_url || me.avatar_url) : null,
        members: members.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          user: m.user,
        })),
        my_role: (myMemberships || []).find((m) => m.chat_id === c.id)?.role || 'member',
        last_message: lastByChat[c.id] || null,
        unread: unreadByChat[c.id] || 0,
        is_bhandar: c.id === bhandarId,
        is_snehra: isSnehra,
        created_at: c.created_at,
      };
    });

    summaries.sort((a, b) => {
      if (a.is_bhandar !== b.is_bhandar) return a.is_bhandar ? -1 : 1;
      if (a.is_snehra !== b.is_snehra) return a.is_snehra ? -1 : 1;
      const ta = a.last_message?.created_at || a.created_at;
      const tb = b.last_message?.created_at || b.created_at;
      return tb.localeCompare(ta);
    });

    return res.status(200).json({ me, chats: summaries });
  } catch (err) {
    console.error('bootstrap error:', err);
    return res.status(500).json({ error: err.message });
  }
}
