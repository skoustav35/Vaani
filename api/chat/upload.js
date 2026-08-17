import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { fileName, fileBase64, contentType } = req.body || {};
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'fileName and fileBase64 are required' });

    const safeName = String(fileName).toLowerCase().replace(/[^a-z0-9.\-_]/g, '-').slice(-70);
    const path = `vaani/${user.id}-${Date.now()}-${safeName}`;
    const buffer = Buffer.from(fileBase64, 'base64');

    const { error } = await supabase.storage
      .from('chat-media')
      .upload(path, buffer, { contentType: contentType || 'image/jpeg', upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}
