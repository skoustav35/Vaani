import supabase from './db-client.js';

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Sign in to upload' });
    const { data: { user }, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !user) return res.status(401).json({ error: 'Invalid session' });

    const { fileName, fileBase64, contentType } = req.body || {};
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'fileName and fileBase64 are required' });

    const safeName = String(fileName).toLowerCase().replace(/[^a-z0-9.\-_]/g, '-').slice(-80);
    const path = `covers/${user.id}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(fileBase64, 'base64');

    const { error } = await supabase.storage
      .from('media')
      .upload(path, buffer, { contentType: contentType || 'image/jpeg', upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('upload API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
