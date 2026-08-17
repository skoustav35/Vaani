import supabase from '../db-client.js';
import { cors, requireUser, isMember } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const chatId = String(req.query.id || '');
      if (!chatId) return res.status(400).json({ error: 'id is required' });
      const role = await isMember(chatId, user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this chat' });

      const { data: chat, error } = await supabase.from('chats').select('*').eq('id', chatId).single();
      if (error) throw error;
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id, role, joined_at')
        .eq('chat_id', chatId);
      const ids = [...new Set((members || []).map((m) => m.user_id))];
      const { data: users } = ids.length
        ? await supabase.from('users').select('id, username, display_name, avatar_url, last_seen, phone_number').in('id', ids)
        : { data: [] };
      const map = {};
      for (const u of users || []) map[u.id] = u;
      const merged = (members || []).map((m) => ({ ...m, user: map[m.user_id] || null }));
      return res.status(200).json({ chat, members: merged, my_role: role });
    }

    if (req.method === 'POST') {
      const { type, name, member_ids = [] } = req.body || {};
      if (!['group', 'channel'].includes(type)) return res.status(400).json({ error: 'type must be group or channel' });
      const cleanName = String(name || '').trim();
      if (cleanName.length < 3) return res.status(400).json({ error: 'Name your Sangha (3+ characters)' });
      if (cleanName.length > 48) return res.status(400).json({ error: 'Name too long' });

      const { data: chat, error } = await supabase
        .from('chats')
        .insert({ id: crypto.randomUUID(), type, name: cleanName })
        .select()
        .single();
      if (error) throw error;

      const memberRows = [
        { chat_id: chat.id, user_id: user.id, role: 'owner' },
        ...member_ids
          .filter((id) => id && id !== user.id)
          .slice(0, 30)
          .map((id) => ({ chat_id: chat.id, user_id: String(id), role: 'member' })),
      ];
      const { error: mErr } = await supabase.from('chat_members').insert(memberRows);
      if (mErr) throw mErr;

      await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        chat_id: chat.id,
        sender_id: user.id,
        content: type === 'channel'
          ? `The Sangha “${cleanName}” is formed. Only the Acharya speaks; all may listen.`
          : `The circle “${cleanName}” is formed. Speak freely, speak kindly.`,
      });

      return res.status(201).json({ chat_id: chat.id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('chats error:', err);
    return res.status(500).json({ error: err.message });
  }
}
