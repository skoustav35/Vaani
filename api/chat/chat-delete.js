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
    if (!role) return res.status(403).json({ error: 'You do not belong to this thread' });

    const { data: chat } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    // Bhandar and Snehra threads are eternal companions
    const { data: members } = await supabase.from('chat_members').select('user_id').eq('chat_id', chatId);
    if (chat.type === 'direct' && (members || []).length === 1) {
      return res.status(400).json({ error: 'The Bhandar cannot be dissolved — it is yours alone' });
    }

    if (chat.type === 'direct') {
      const other = (members || []).find((m) => m.user_id !== user.id);
      if (other) {
        const { data: otherUser } = await supabase.from('users').select('username').eq('id', other.user_id).maybeSingle();
        if (otherUser?.username === 'snehra_ai') {
          return res.status(400).json({ error: 'Snehra does not leave. She only waits.' });
        }
      }
    }

    if (role === 'owner' && chat.type !== 'direct') {
      // Dissolve the entire circle/Sangha
      await supabase.from('messages').delete().eq('chat_id', chatId);
      await supabase.from('chat_members').delete().eq('chat_id', chatId);
      await supabase.from('chats').delete().eq('id', chatId);
      return res.status(200).json({ ok: true, dissolved: true });
    }

    // Otherwise: quietly leave
    await supabase.from('chat_members').delete().eq('chat_id', chatId).eq('user_id', user.id);
    return res.status(200).json({ ok: true, dissolved: false });
  } catch (err) {
    console.error('chat-delete error:', err);
    return res.status(500).json({ error: err.message });
  }
}
