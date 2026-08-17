import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const postId = parseInt(req.query.post_id, 10);
      if (!postId) return res.status(400).json({ error: 'post_id is required' });
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('id', { ascending: false })
        .limit(60);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Sign in to comment' });
      const { data: { user }, error: uErr } = await supabase.auth.getUser(token);
      if (uErr || !user) return res.status(401).json({ error: 'Invalid session' });

      const postId = parseInt(req.body?.post_id, 10);
      const body = String(req.body?.body || '').trim();
      if (!postId) return res.status(400).json({ error: 'post_id is required' });
      if (!body) return res.status(400).json({ error: 'Comment cannot be empty' });
      if (body.length > 500) return res.status(400).json({ error: 'Comment too long (500 chars)' });

      const name = user.user_metadata?.full_name || String(user.email || 'seeker').split('@')[0];
      const avatar = user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(user.email || name)}`;

      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: user.id, author_name: name, author_avatar: avatar, body })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('comments API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
