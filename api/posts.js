import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function readingTime(markdown) {
  const words = String(markdown || '').replace(/[#*`>\-\[\](){}$\\]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);

    if (req.method === 'GET') {
      const { cursor, limit = '6', type, saved } = req.query;
      const lim = Math.min(24, Math.max(1, parseInt(limit, 10) || 6));

      let query = supabase.from('posts').select('*').order('id', { ascending: false });

      if (type === 'media') query = query.in('type', ['image', 'video']);
      else if (type === 'article') query = query.eq('type', 'article');

      if (saved === '1') {
        if (!user) return res.status(401).json({ error: 'Sign in to view your saved posts' });
        const { data: saveRows, error: sErr } = await supabase
          .from('saves').select('post_id').eq('user_id', user.id);
        if (sErr) throw sErr;
        const ids = (saveRows || []).map(r => r.post_id);
        if (ids.length === 0) return res.status(200).json({ data: [], nextCursor: null });
        query = query.in('id', ids);
      }

      if (cursor) query = query.lt('id', parseInt(cursor, 10));
      query = query.limit(lim + 1);

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      const hasMore = rows.length > lim;
      const page = hasMore ? rows.slice(0, lim) : rows;
      const nextCursor = hasMore ? page[page.length - 1].id : null;

      if (user && page.length > 0) {
        const ids = page.map(p => p.id);
        const [{ data: likeRows }, { data: saveRows }] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', ids),
          supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', ids),
        ]);
        const liked = new Set((likeRows || []).map(r => r.post_id));
        const savedSet = new Set((saveRows || []).map(r => r.post_id));
        page.forEach(p => { p.liked = liked.has(p.id); p.saved = savedSet.has(p.id); });
      }

      return res.status(200).json({ data: page, nextCursor });
    }

    if (req.method === 'POST') {
      if (!user) return res.status(401).json({ error: 'Sign in to publish' });
      const { title, body, tags = [], cover_url = null, excerpt = null } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
      if (!body || String(body).trim().length < 40) return res.status(400).json({ error: 'Write at least 40 characters of substance' });

      const name = user.user_metadata?.full_name || String(user.email || 'seeker').split('@')[0];
      const avatar = user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(user.email || name)}`;

      const { data, error } = await supabase
        .from('posts')
        .insert({
          type: 'article',
          title: String(title).trim(),
          body: String(body),
          excerpt: excerpt ? String(excerpt).slice(0, 220) : null,
          media_url: cover_url,
          author_name: name,
          author_avatar: avatar,
          author_title: 'Forge contributor',
          tags: (Array.isArray(tags) ? tags : []).map(t => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 8),
          reading_time: readingTime(body),
          likes_count: 0,
          saves_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('posts API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
