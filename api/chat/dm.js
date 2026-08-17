import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const otherId = String(req.body?.user_id || '');
    if (!otherId || otherId === user.id) return res.status(400).json({ error: 'user_id is required' });

    // find an existing direct chat shared by both
    const { data: chats } = await supabase.from('chats').select('id').eq('type', 'direct');
    const chatIds = (chats || []).map((c) => c.id);
    if (chatIds.length) {
      const { data: rows } = await supabase
        .from('chat_members')
        .select('chat_id, user_id')
        .in('chat_id', chatIds)
        .in('user_id', [user.id, otherId]);
      const byChat = {};
      for (const r of rows || []) (byChat[r.chat_id] = byChat[r.chat_id] || []).push(r.user_id);
      for (const [cid, arr] of Object.entries(byChat)) {
        if (arr.includes(user.id) && arr.includes(otherId) && arr.length === 2) {
          return res.status(200).json({ chat_id: cid, created: false });
        }
      }
    }

    const { data: chat, error } = await supabase.from('chats').insert({ id: crypto.randomUUID(), type: 'direct', name: null }).select().single();
    if (error) throw error;
    const { error: mErr } = await supabase.from('chat_members').insert([
      { chat_id: chat.id, user_id: user.id, role: 'owner' },
      { chat_id: chat.id, user_id: otherId, role: 'member' },
    ]);
    if (mErr) throw mErr;

    return res.status(201).json({ chat_id: chat.id, created: true });
  } catch (err) {
    console.error('dm error:', err);
    return res.status(500).json({ error: err.message });
  }
}
