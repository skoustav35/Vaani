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
    const q = String(req.query.q || '').trim();
    const filter = String(req.query.filter || 'all');

    let query = supabase.from('posts').select('*');

    if (q) {
      const safe = q.replace(/[%,()[\]{}"']/g, ' ').replace(/\s+/g, ' ').trim();
      query = query.or(`title.ilike.%${safe}%,body.ilike.%${safe}%,author_name.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
      query = query.order('likes_count', { ascending: false }).limit(40);
    } else {
      query = query.order('likes_count', { ascending: false }).limit(12);
    }

    if (filter === 'media') query = query.in('type', ['image', 'video']);
    else if (['image', 'video', 'article'].includes(filter)) query = query.eq('type', filter);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const user = await getUser(req);
    if (user && rows.length > 0) {
      const ids = rows.map(p => p.id);
      const [{ data: likeRows }, { data: saveRows }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
        supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', ids),
      ]);
      const liked = new Set((likeRows || []).map(r => r.post_id));
      const savedSet = new Set((saveRows || []).map(r => r.post_id));
      rows.forEach(p => { p.liked = liked.has(p.id); p.saved = savedSet.has(p.id); });
    }

    return res.status(200).json({ data: rows, query: q });
  } catch (err) {
    console.error('search API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
