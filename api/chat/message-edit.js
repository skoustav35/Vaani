import supabase from '../db-client.js';
import { cors, requireUser, attachSenders } from './_shared.js';

export const EDIT_MARK = ' §ed';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const messageId = String(req.body?.message_id || '');
    const content = String(req.body?.content || '').trim();
    if (!messageId) return res.status(400).json({ error: 'message_id is required' });
    if (!content) return res.status(400).json({ error: 'A message cannot be hollow' });
    if (content.length > 4000) return res.status(400).json({ error: 'Message too long' });

    const { data: msg, error: mErr } = await supabase.from('messages').select('*').eq('id', messageId).single();
    if (mErr || !msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== user.id) return res.status(403).json({ error: 'Only the author may re-carve a message' });

    const bare = String(msg.content || '').replace(/\s*§ed$/, '');
    if (bare === content) return res.status(200).json(msg); // nothing changed

    const { data, error } = await supabase
      .from('messages')
      .update({ content: content + EDIT_MARK })
      .eq('id', messageId)
      .select('*')
      .single();
    if (error) throw error;

    const [enriched] = await attachSenders([data]);
    return res.status(200).json(enriched);
  } catch (err) {
    console.error('message-edit error:', err);
    return res.status(500).json({ error: err.message });
  }
}
