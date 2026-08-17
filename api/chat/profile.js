import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { display_name, username, avatar_url, status_emoji, status_text } = req.body || {};
    const patch = {};
    if (display_name && String(display_name).trim().length >= 2) {
      patch.display_name = String(display_name).trim().slice(0, 60);
    }
    if (username) {
      const clean = String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
      if (clean.length < 3) return res.status(400).json({ error: 'Username needs 3+ characters (a–z, 0–9, _)' });
      const { data: clash } = await supabase.from('users').select('id').eq('username', clean).maybeSingle();
      if (clash && clash.id !== user.id) return res.status(409).json({ error: `@${clean} is already spoken for` });
      patch.username = clean;
    }
    if (avatar_url) {
      const url = String(avatar_url);
      if (!/^https?:\/\//.test(url)) return res.status(400).json({ error: 'avatar_url must be a link' });
      patch.avatar_url = url;
    }
    if (Object.keys(patch).length === 0 && status_emoji === undefined && status_text === undefined) {
      return res.status(400).json({ error: 'Nothing to amend' });
    }

    let profile = null;
    if (Object.keys(patch).length) {
      const { data, error } = await supabase.from('users').update(patch).eq('id', user.id).select().single();
      if (error) throw error;
      profile = data;
    }

    if (status_emoji !== undefined || status_text !== undefined) {
      const emoji = String(status_emoji || '🌿').slice(0, 8);
      const text = String(status_text || '').trim().slice(0, 90);
      const { error } = await supabase
        .from('user_status')
        .upsert({ user_id: user.id, emoji, text, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    }

    if (!profile) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      profile = data;
    }
    return res.status(200).json(profile);
  } catch (err) {
    console.error('profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}
