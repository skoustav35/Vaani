import supabase from '../db-client.js';
import { cors, requireUser, isMember } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const messageId = String(req.body?.message_id || '');
    const scope = req.body?.scope === 'everyone' ? 'everyone' : 'me';
    if (!messageId) return res.status(400).json({ error: 'message_id is required' });

    const { data: msg, error: mErr } = await supabase.from('messages').select('*').eq('id', messageId).single();
    if (mErr || !msg) return res.status(404).json({ error: 'Already carried away' });

    const role = await isMember(msg.chat_id, user.id);
    if (!role) return res.status(403).json({ error: 'Not your thread to touch' });

    if (scope === 'me') {
      // Any member may hide any message from their own view.
      const { data: existing } = await supabase
        .from('hidden_messages')
        .select('message_id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('hidden_messages').insert({ message_id: messageId, user_id: user.id });
        if (error) throw error;
      }
      return res.status(200).json({ ok: true, scope: 'me', id: messageId, chat_id: msg.chat_id });
    }

    // scope: everyone
    if (msg.sender_id !== user.id) {
      const { data: chat } = await supabase.from('chats').select('type').eq('id', msg.chat_id).single();
      if (chat?.type === 'direct') return res.status(403).json({ error: 'Private words belong to their speaker' });
      if (role === 'member') return res.status(403).json({ error: 'Only the author or a circle guardian may remove a message for everyone' });
    }

    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) throw error;
    await supabase.from('reactions').delete().eq('message_id', messageId);
    await supabase.from('pinned_messages').delete().eq('message_id', messageId);
    return res.status(200).json({ ok: true, scope: 'everyone', id: messageId, chat_id: msg.chat_id });
  } catch (err) {
    console.error('message-delete error:', err);
    return res.status(500).json({ error: err.message });
  }
}
