import supabase from '../db-client.js';
import { cors, requireUser, isMember, attachSenders } from './_shared.js';

const PAGE_SIZE = 40;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const chatId = String(req.query.chat_id || '');
      if (!chatId) return res.status(400).json({ error: 'chat_id is required' });
      const role = await isMember(chatId, user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this chat' });

      let query = supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE + 1);

      const before = req.query.before ? String(req.query.before) : null;
      if (before) {
        const { data: anchor } = await supabase.from('messages').select('created_at').eq('id', before).single();
        if (anchor) query = query.lt('created_at', anchor.created_at);
      }

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data || []).reverse();
      let hasMore = rows.length > PAGE_SIZE;
      let page = hasMore ? rows.slice(rows.length - PAGE_SIZE) : rows;

      // honour "deleted for me" veils
      const pageIds = page.map((r) => r.id);
      if (pageIds.length) {
        const { data: hidden } = await supabase
          .from('hidden_messages')
          .select('message_id')
          .eq('user_id', user.id)
          .in('message_id', pageIds);
        const veil = new Set((hidden || []).map((h) => h.message_id));
        page = page.filter((r) => !veil.has(r.id));
        rows = rows.filter((r) => !veil.has(r.id));
      }

      const enriched = await attachSenders(page);
      return res.status(200).json({ data: enriched, nextCursor: hasMore ? (page[0]?.id ?? rows[0]?.id ?? null) : null });
    }

    if (req.method === 'POST') {
      const { chat_id, content, media_url } = req.body || {};
      if (!chat_id) return res.status(400).json({ error: 'chat_id is required' });
      const body = String(content || '').trim();
      if (!body && !media_url) return res.status(400).json({ error: 'Message cannot be empty' });
      if (body.length > 4000) return res.status(400).json({ error: 'Message too long (4000 chars)' });

      const role = await isMember(chat_id, user.id);
      if (!role) return res.status(403).json({ error: 'Not a member of this chat' });

      // Sangha channels: only owner/admin may post
      if (role === 'member') {
        const { data: chat } = await supabase.from('chats').select('type').eq('id', chat_id).single();
        if (chat?.type === 'channel') return res.status(403).json({ error: 'Only the Acharya can post in a Sangha' });
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({ id: crypto.randomUUID(), chat_id, sender_id: user.id, content: body || null, media_url: media_url || null })
        .select('*')
        .single();
      if (error) throw error;
      const [enriched] = await attachSenders([data]);
      return res.status(201).json(enriched);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('messages error:', err);
    return res.status(500).json({ error: err.message });
  }
}
