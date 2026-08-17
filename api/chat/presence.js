import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const now = new Date().toISOString();
    await supabase.from('users').update({ last_seen: now }).eq('id', user.id);
    return res.status(200).json({ ok: true, at: now });
  } catch (err) {
    console.error('presence error:', err);
    return res.status(500).json({ error: err.message });
  }
}
