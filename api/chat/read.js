import supabase from '../db-client.js';
import { cors, requireUser, isMember } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const chatId = String(req.body?.chat_id || '');
    if (!chatId) return res.status(400).json({ error: 'chat_id is required' });
    const role = await isMember(chatId, user.id);
    if (!role) return res.status(403).json({ error: 'Not a member of this chat' });

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', user.id);
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('read error:', err);
    return res.status(500).json({ error: err.message });
  }
}
