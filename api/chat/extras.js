import supabase from '../db-client.js';
import { cors, requireUser, isMember, attachSenders } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    /* GET ?chat_id → { pins, reactions } */
    if (req.method === 'GET') {
      const chatId = String(req.query.chat_id || '');
      if (!chatId) return res.status(400).json({ error: 'chat_id is required' });
      const role = await isMember(chatId, user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this chat' });

      const { data: pinRows } = await supabase
        .from('pinned_messages')
        .select('message_id, pinned_at, pinned_by')
        .eq('chat_id', chatId)
        .order('pinned_at', { ascending: false });
      const pinIds = (pinRows || []).map((p) => p.message_id);
      let pinMessages = [];
      if (pinIds.length) {
        const { data: msgs } = await supabase.from('messages').select('*').in('id', pinIds);
        pinMessages = await attachSenders(msgs || []);
        pinMessages.sort((a, b) => pinIds.indexOf(a.id) - pinIds.indexOf(b.id));
      }

      const { data: chatMsgs } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(160);
      const msgIds = (chatMsgs || []).map((m) => m.id);
      let reactionRows = [];
      if (msgIds.length) {
        const { data } = await supabase.from('reactions').select('*').in('message_id', msgIds);
        reactionRows = data || [];
      }

      // group by message → { emoji: { count, mine } }
      const reactions = {};
      for (const r of reactionRows) {
        reactions[r.message_id] = reactions[r.message_id] || {};
        const g = (reactions[r.message_id][r.emoji] = reactions[r.message_id][r.emoji] || { count: 0, mine: false });
        g.count++;
        if (r.user_id === user.id) g.mine = true;
      }

      return res.status(200).json({ pins: pinMessages, reactions });
    }

    if (req.method === 'POST') {
      const { op, chat_id, message_id, emoji } = req.body || {};
      const chatId = String(chat_id || '');
      const messageId = String(message_id || '');
      if (!chatId || !messageId) return res.status(400).json({ error: 'chat_id and message_id required' });
      const role = await isMember(chatId, user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this chat' });

      const { data: msg } = await supabase.from('messages').select('id, sender_id').eq('id', messageId).single();
      if (!msg || msg === null) return res.status(404).json({ error: 'Message not found' });

      if (op === 'pin' || op === 'unpin') {
        const canPin = msg.sender_id === user.id || role === 'owner' || role === 'admin';
        if (!canPin) return res.status(403).json({ error: 'Only the author or a guardian may pin to the ridge' });
        if (op === 'pin') {
          const { data: existing } = await supabase.from('pinned_messages').select('message_id').eq('chat_id', chatId).eq('message_id', messageId).maybeSingle();
          if (!existing) await supabase.from('pinned_messages').insert({ chat_id: chatId, message_id: messageId, pinned_by: user.id });
        } else {
          await supabase.from('pinned_messages').delete().eq('chat_id', chatId).eq('message_id', messageId);
        }
        return res.status(200).json({ ok: true, op });
      }

      if (op === 'react') {
        const sym = String(emoji || '❤️').slice(0, 8) || '❤️';
        const { data: existing } = await supabase
          .from('reactions')
          .select('id')
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', sym)
          .maybeSingle();
        if (existing) {
          await supabase.from('reactions').delete().eq('id', existing.id);
          return res.status(200).json({ ok: true, blessed: false });
        }
        await supabase.from('reactions').insert({ message_id: messageId, user_id: user.id, emoji: sym });
        return res.status(200).json({ ok: true, blessed: true });
      }

      return res.status(400).json({ error: 'unknown op' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('extras error:', err);
    return res.status(500).json({ error: err.message });
  }
}
