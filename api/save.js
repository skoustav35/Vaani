import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Sign in to save posts' });
    const { data: { user }, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !user) return res.status(401).json({ error: 'Invalid session' });

    const postId = parseInt(req.body?.post_id, 10);
    if (!postId) return res.status(400).json({ error: 'post_id is required' });

    const { data: post, error: pErr } = await supabase.from('posts').select('saves_count').eq('id', postId).single();
    if (pErr || !post) return res.status(404).json({ error: 'Post not found' });

    const { data: existing } = await supabase.from('saves').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();

    let saved;
    if (existing) {
      const { error } = await supabase.from('saves').delete().eq('id', existing.id);
      if (error) throw error;
      saved = false;
    } else {
      const { error } = await supabase.from('saves').insert({ post_id: postId, user_id: user.id });
      if (error) throw error;
      saved = true;
    }

    const saves = Math.max(0, (post.saves_count || 0) + (saved ? 1 : -1));
    await supabase.from('posts').update({ saves_count: saves }).eq('id', postId);

    return res.status(200).json({ saved, saves_count: saves });
  } catch (err) {
    console.error('save API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
