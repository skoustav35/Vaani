import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';
import { AVS_URL_FALLBACK, AVS_KEY_FALLBACK, AVS_MODEL_FALLBACK } from './avs.secrets.js';

export const config = { maxDuration: 40 };

const GATEWAY_URL = process.env.AVS_GATEWAY_URL || AVS_URL_FALLBACK;
const GATEWAY_KEY = process.env.AVS_GATEWAY_KEY || AVS_KEY_FALLBACK;
const MODEL = process.env.AVS_MODEL || AVS_MODEL_FALLBACK;

const INSTRUCTIONS = {
  gentler: 'rewrite to be gentler and warmer, keeping the meaning',
  crisper: 'rewrite tighter and crisper, removing every needless word',
  poetic: 'rewrite as a small two-line verse with an Indian classical heartbeat (nature imagery welcome), still meaning the same thing',
  funny: 'rewrite with gentle wit and warmth, never mean, same meaning',
  shloka: 'recast it in the cadence of a Sanskrit shloka rendered in English — solemn, balanced, brief',
  grammar: 'fix grammar, punctuation and flow; change nothing else, keep the voice',
  hindi: 'translate into natural, warm Hindi (Devanagari script); keep tone',
  bengali: 'translate into natural Bengali (Bangla script); keep tone',
  expand: 'expand warmly by one or two sentences, same voice, no repetition',
  formal: 'rewrite with dignified, formal grace — a letter written by lamplight',
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const text = String(req.body?.text || '').trim();
    const instruction = String(req.body?.instruction || '');
    if (!text) return res.status(400).json({ error: 'Nothing to chisel' });
    if (text.length > 3900) return res.status(400).json({ error: 'Too long to chisel' });
    const guide = INSTRUCTIONS[instruction];
    if (!guide) return res.status(400).json({ error: 'Unknown chisel' });
    if (!GATEWAY_KEY) return res.status(503).json({ error: 'Snehra\'s spark is not placed — AI chisels are asleep' });

    // Only the author's own messages may be re-carved — enforced when applying.
    const messageId = String(req.body?.message_id || '');
    if (messageId) {
      const { data: msg } = await supabase.from('messages').select('sender_id').eq('id', messageId).maybeSingle();
      if (!msg || msg.sender_id !== user.id) return res.status(403).json({ error: 'Only the author may re-carve' });
    }

    const gw = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_KEY}`, 'x-api-key': GATEWAY_KEY },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: 'You are the Chisel — a precise copy-editor living inside the Vaani messenger. Rewrite the user\'s message EXACTLY as instructed. Return ONLY the rewritten message text. No quotes, no preamble, no explanation, no emojis unless they serve the tone request.',
          },
          { role: 'user', content: `INSTRUCTION: ${guide}.\n\nMESSAGE:\n${text}` },
        ],
      }),
    });
    if (!gw.ok) throw new Error(`Gateway answered ${gw.status}`);
    const gwData = await gw.json();
    let out = String(gwData?.choices?.[0]?.message?.content || '').trim();
    out = out.replace(/^["'”“]|["'”“]$/g, '').trim();
    if (!out) throw new Error('The chisel returned silence');
    return res.status(200).json({ text: out.slice(0, 3900) });
  } catch (err) {
    console.error('rewrite error:', err);
    return res.status(500).json({ error: err.message });
  }
}
