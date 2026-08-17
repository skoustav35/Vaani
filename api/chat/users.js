import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    // direct profile lookup, with living status
    const id = String(req.query.id || '');
    if (id) {
      const { data: u, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, last_seen, phone_number')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!u) return res.status(404).json({ error: 'No such soul' });
      const { data: st } = await supabase.from('user_status').select('emoji, text').eq('user_id', id).maybeSingle();
      return res.status(200).json({ ...u, status: st || null });
    }

    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.status(200).json({ data: [] });
    const safe = q.replace(/[%,()[\]{}"']/g, ' ');

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, last_seen')
      .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%,phone_number.ilike.%${safe}%`)
      .neq('id', user.id)
      .limit(12);
    if (error) throw error;

    return res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error('users error:', err);
    return res.status(500).json({ error: err.message });
  }
}
