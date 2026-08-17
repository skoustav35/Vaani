import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
    if (error || !data) return res.status(404).json({ error: 'Post not found' });

    const user = await getUser(req);
    if (user) {
      const [{ data: like }, { data: save }] = await Promise.all([
        supabase.from('likes').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
        supabase.from('saves').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
      ]);
      data.liked = !!like;
      data.saved = !!save;
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('post API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
