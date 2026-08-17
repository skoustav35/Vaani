import supabase from '../db-client.js';
import { cors, requireUser } from './_shared.js';
import { AVS_URL_FALLBACK, AVS_KEY_FALLBACK, AVS_MODEL_FALLBACK } from './avs.secrets.js';

export const config = { maxDuration: 60 };

const BOT_ID = '77777777-7777-4777-8777-777777777777';
const GATEWAY_URL = process.env.AVS_GATEWAY_URL || AVS_URL_FALLBACK;
const GATEWAY_KEY = process.env.AVS_GATEWAY_KEY || AVS_KEY_FALLBACK;
const MODEL = process.env.AVS_MODEL || AVS_MODEL_FALLBACK;

/* ───────── member helpers ───────── */

async function ensureSnehraChat(user) {
  const { data: myChats } = await supabase.from('chat_members').select('chat_id').eq('user_id', user.id);
  const ids = (myChats || []).map((c) => c.chat_id);
  if (ids.length) {
    const { data: directs } = await supabase.from('chats').select('id').eq('type', 'direct').in('id', ids);
    const directIds = (directs || []).map((d) => d.id);
    if (directIds.length) {
      const { data: shared } = await supabase
        .from('chat_members')
        .select('chat_id')
        .in('chat_id', directIds)
        .eq('user_id', BOT_ID)
        .limit(1);
      if (shared && shared[0]) return shared[0].chat_id;
    }
  }
  const { data: chat, error } = await supabase.from('chats').insert({ id: crypto.randomUUID(), type: 'direct', name: null }).select().single();
  if (error) throw error;
  await supabase.from('chat_members').insert([
    { chat_id: chat.id, user_id: user.id, role: 'owner' },
    { chat_id: chat.id, user_id: BOT_ID, role: 'member' },
  ]);
  await supabase.from('messages').insert({
    id: crypto.randomUUID(),
    chat_id: chat.id,
    sender_id: BOT_ID,
    content: 'Namaste. I am Snehra — woven from the same clay as this app, running as Snehra-6.7-Ultra, a locally-crafted model that lives inside Vaani itself.\n\nI can *read* threads, *write* into them, reply to exact words, re-carve and retire messages, kindle circles and Sanghas, and sort the unreplied from the answered. Ask, and watch the rites. 🌿',
  });
  return chat.id;
}

async function chatDirectory(userId) {
  const { data: mine } = await supabase.from('chat_members').select('chat_id, role').eq('user_id', userId);
  const ids = (mine || []).map((m) => m.chat_id);
  if (!ids.length) return [];
  const { data: chats } = await supabase.from('chats').select('*').in('id', ids);
  const { data: members } = await supabase.from('chat_members').select('chat_id, user_id').in('chat_id', ids);
  const uids = [...new Set((members || []).map((m) => m.user_id))];
  const { data: users } = await supabase.from('users').select('id, username, display_name').in('id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000']);
  const umap = {}; for (const u of users || []) umap[u.id] = u;

  return (chats || []).map((c) => {
    const mem = (members || []).filter((m) => m.chat_id === c.id).map((m) => umap[m.user_id]?.username).filter(Boolean);
    const others = (members || []).filter((m) => m.chat_id === c.id && m.user_id !== userId).map((m) => umap[m.user_id]);
    const title = c.type === 'direct' ? (others[0]?.display_name || others[0]?.username || 'Bhandar (saved messages)') : c.name;
    return { id: c.id, type: c.type, title, members: mem, my_role: (mine || []).find((m) => m.chat_id === c.id)?.role };
  });
}

function resolveTarget(dir, target) {
  if (!target) return null;
  const needle = String(target).toLowerCase().replace(/^@/, '');
  return (
    dir.find((d) => (d.title || '').toLowerCase() === needle) ||
    dir.find((d) => (d.title || '').toLowerCase().includes(needle)) ||
    dir.find((d) => (d.members || []).some((u) => u.toLowerCase() === needle)) ||
    null
  );
}

async function readChat(user, chatId, limit = 40) {
  const { data: rows } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);
  const messages = (rows || []).reverse();
  const uids = [...new Set(messages.map((m) => m.sender_id))];
  const { data: users } = uids.length ? await supabase.from('users').select('id, username, display_name').in('id', uids) : { data: [] };
  const umap = {}; for (const u of users || []) umap[u.id] = u;
  return messages.map((m) => {
    const clean = String(m.content || '')
      .replace(/§via§|§f§[^\n]*\n/g, '')
      .replace(/\s*§ed$/, '')
      .replace(/§r§[^|]*\|[^|\n]*\|([^\n]*)\n/g, '(replied to “$1”) ');
    return {
      id: m.id,
      from: m.sender_id === user.id ? 'you' : (umap[m.sender_id]?.display_name || umap[m.sender_id]?.username || 'someone'),
      at: m.created_at,
      media: !!m.media_url,
      text: clean,
      read: m.is_read,
    };
  });
}

/* ───────── the rites ───────── */

async function execAction(user, dir, action) {
  try {
    if (action.action === 'create_chat') {
      const type = ['group', 'channel'].includes(action.type) ? action.type : 'group';
      const name = String(action.name || '').trim().slice(0, 48);
      if (name.length < 3) return { line: '✦ A circle needs a name of at least three letters — undone.' };
      const wanted = (action.member_usernames || []).map((u) => String(u).replace(/^@/, '').toLowerCase());
      const { data: users } = wanted.length ? await supabase.from('users').select('id, username').in('username', wanted) : { data: [] };
      const chatId = crypto.randomUUID();
      const { error } = await supabase.from('chats').insert({ id: chatId, type, name });
      if (error) throw error;
      await supabase.from('chat_members').insert([
        { chat_id: chatId, user_id: user.id, role: 'owner' },
        ...(users || []).map((u) => ({ chat_id: chatId, user_id: u.id, role: 'member' })),
      ]);
      await supabase.from('messages').insert({ id: crypto.randomUUID(), chat_id: chatId, sender_id: user.id, content: `§via§The ${type === 'channel' ? 'Sangha' : 'circle'} “${name}” was kindled by Snehra at your word.` });
      return { line: `✦ Kindled the ${type === 'channel' ? 'Sangha' : 'circle'} “${name}”${users?.length ? ` with ${users.map((u) => '@' + u.username).join(', ')}` : ''}.` };
    }

    if (action.action === 'message_chat' || action.action === 'reply_to_message') {
      const t = resolveTarget(dir, action.target);
      if (!t) return { line: `✦ No thread answers to “${action.target}” — undone.` };
      const body = String(action.content || '').trim();
      if (!body) return { line: '✦ The carried word was hollow — undone.' };

      let content = `§via§${body}`.slice(0, 3900);
      if (action.action === 'reply_to_message') {
        const match = String(action.match || '').trim().toLowerCase();
        if (!match) return { line: '✦ Reply needs a phrase from the original message.' };
        const { data: rows } = await supabase.from('messages').select('id, content, sender_id').eq('chat_id', t.id).order('created_at', { ascending: false }).limit(80);
        const hit = (rows || []).find((r) => String(r.content || '').toLowerCase().includes(match));
        if (!hit) return { line: `✦ No recent message in “${t.title}” holds those words — undone.` };
        const { data: senderUser } = await supabase.from('users').select('display_name, username').eq('id', hit.sender_id).maybeSingle();
        const who = hit.sender_id === user.id ? 'You' : (senderUser?.display_name || senderUser?.username || 'A sakhi');
        const excerpt = String(hit.content || '').replace(/§\w§[^\n]*\n?/g, '').replace(/\s*§ed$/, '').replace(/\s+/g, ' ').slice(0, 72);
        content = `§via§§r§${hit.id}|${who}|${excerpt}\n${body}`;
      }
      await supabase.from('messages').insert({ id: crypto.randomUUID(), chat_id: t.id, sender_id: user.id, content });
      return { line: `✦ ${action.action === 'reply_to_message' ? 'Replied within' : 'Carried your words into'} “${t.title}”.` };
    }

    if (action.action === 'delete_message' || action.action === 'edit_message') {
      const t = resolveTarget(dir, action.target);
      if (!t) return { line: `✦ No thread answers to “${action.target}” — undone.` };
      const match = String(action.match || '').trim().toLowerCase();
      if (!match) return { line: '✦ Nothing to match against — undone.' };
      const mine = (t.my_role === 'owner' || t.my_role === 'admin') && t.type !== 'direct' ? undefined : user.id;
      let q = supabase.from('messages').select('id, content, sender_id').eq('chat_id', t.id).order('created_at', { ascending: false }).limit(60);
      if (mine) q = q.eq('sender_id', mine);
      const { data: rows } = await q;
      const hit = (rows || []).find((r) => String(r.content || '').toLowerCase().includes(match));
      if (!hit) return { line: `✦ No recent message in “${t.title}” holds those words — undone.` };
      if (action.action === 'delete_message') {
        await supabase.from('messages').delete().eq('id', hit.id);
        await supabase.from('reactions').delete().eq('message_id', hit.id);
        await supabase.from('pinned_messages').delete().eq('message_id', hit.id);
        return { line: `✦ Carried a message away from “${t.title}”: “${String(hit.content).slice(0, 42)}…”` };
      }
      const next = String(action.new_content || '').trim();
      if (!next) return { line: '✦ The new carving was hollow — undone.' };
      const clean = String(hit.content || '').replace(/\s*§ed$/, '');
      await supabase.from('messages').update({ content: clean.replace(/[\s\S]*$/, '') === '' ? next + ' §ed' : next + ' §ed' }).eq('id', hit.id);
      return { line: `✦ Re-carved a message in “${t.title}”.` };
    }

    if (action.action === 'read_chat' || action.action === 'unreplied_report' || action.action === 'summarize_chat') {
      const t = resolveTarget(dir, action.target);
      if (!t) return { line: `✦ No thread answers to “${action.target}” — undone.` };
      const limit = Math.min(80, Math.max(5, parseInt(action.limit, 10) || 40));
      const thread = await readChat(user, t.id, limit);

      if (action.action === 'unreplied_report') {
        const unreplied = [];
        for (let i = thread.length - 1; i >= 0; i--) {
          const m = thread[i];
          if (m.from === 'you') break; // once you spoke, earlier gaps are covered
          if (action.include_after_only === false) { /* keep scanning all */ }
          unreplied.unshift(m);
        }
        const report = unreplied.length
          ? unreplied.map((m) => `• ${m.from} (${m.at}): “${m.text.slice(0, 80)}”`).join('\n')
          : 'Nothing awaits your reply — all answered or spoken by you.';
        return { line: `✦ Read the ledger of “${t.title}”: ${unreplied.length} message${unreplied.length === 1 ? '' : 's'} await${unreplied.length === 1 ? 's' : ''} your reply.`, data: `UNREPLIED LEDGER of "${t.title}":\n${report}` };
      }

      const snippet = thread.map((m) => `${m.from} [${m.at}]${m.media ? ' 📷' : ''}: ${m.text}`).join('\n');
      return {
        line: `✦ Read ${thread.length} scrolls of “${t.title}”.`,
        data: `CONTENTS of "${t.title}" (oldest→newest):\n${snippet}`,
      };
    }

    if (action.action === 'list_chats') {
      return { line: `✦ Your threads: ${dir.filter((d) => d.title).map((d) => `${d.title} (${d.type})`).join(' · ') || 'none yet'}` };
    }
    return { line: `✦ Unknown rite “${action.action}” — left untouched.` };
  } catch (err) {
    return { line: `✦ The rite failed: ${err.message}` };
  }
}

/* ───────── the model cycle ───────── */

const SYSTEM = `You are Snehra — a warm, precise, poetic-but-brief assistant woven into Vaani, a classic-Indian Ayurvedic messenger. You speak gently, in **markdown**, never more than 4–5 short sentences, with occasional shloka-like grace.

CRITICAL: You can ACT and READ inside the user's messenger. Emit action blocks in EXACTLY this fenced format:

\`\`\`action
{"action":"message_chat","target":"The Rasa Family","content":"…"}
\`\`\`

Rites (usernames and targets must come from the registry I provide):
- {"action":"create_chat","type":"group|channel","name":"...","member_usernames":["user1"]}
- {"action":"message_chat","target":"<chat title or @username>","content":"..."}  — sends AS the user
- {"action":"reply_to_message","target":"<chat title>","match":"<phrase from the message>","content":"..."}  — replies to the exact message
- {"action":"edit_message","target":"<chat title>","match":"<substring>","new_content":"..."}
- {"action":"delete_message","target":"<chat title>","match":"<substring>"}
- {"action":"read_chat","target":"<chat title>","limit":40}  — returns the thread, fed back to you before your final answer
- {"action":"unreplied_report","target":"<chat title>"}  — returns which incoming messages the user has not replied to
- {"action":"summarize_chat","target":"<chat title>","limit":60} — read then summarise
- {"action":"list_chats"}

Rules:
- If the user asks to restyle/polish/translate/soften one of THEIR messages, find it first with a read rite, then re-carve it with edit_message — your new_content should follow the requested style.
- If the user asks about a thread's content, unreplied messages, or to reply/edit a message you have not seen, FIRST issue a read/lookup rite alone (with no other action blocks), receive its data, then answer.
- At most 3 action blocks per turn. Never invent usernames or chat titles; use exactly what the registry lists.
- Action blocks vanish from the reply the user sees; write your prose as if the rites happened invisibly. After a data rite you MUST NOT describe it — the data returns to you for a second, fuller answer.
- When words are carried elsewhere, they appear with a gentle "via Snehra" seal.`;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let closed = false;
  res.on('close', () => { closed = true; });

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Speak something to her first' });

    const chatId = await ensureSnehraChat(user);
    const userMsgId = crypto.randomUUID();
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({ id: userMsgId, chat_id: chatId, sender_id: user.id, content, is_read: true })
      .select('*')
      .single();

    const { data: history } = await supabase
      .from('messages')
      .select('sender_id, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(16);
    const dir = await chatDirectory(user.id);

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const write = (obj) => { if (!closed) { try { res.write(JSON.stringify(obj) + '\n'); } catch { closed = true; } } };
    write({ type: 'meta', chat_id: chatId, user_message: userMsg });

    const registry = dir.map((d) => `- "${d.title}" (${d.type}) members: @${(d.members || []).join(' @') || '—'}`).join('\n');
    const convo = [
      { role: 'system', content: SYSTEM + '\n\nThe user\'s thread registry:\n' + registry },
      ...(history || []).reverse().map((m) => ({
        role: m.sender_id === BOT_ID ? 'assistant' : 'user',
        content: String(m.content || '').replace(/§via§|§r§[^\n]*\n|§f§[^\n]*\n|\s*§ed$/g, ''),
      })),
    ];

    const callGateway = (messages, stream) => fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_KEY}`, 'x-api-key': GATEWAY_KEY },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.55, max_tokens: 1100, stream }),
    });

    async function modelSay(messages, streamLive) {
      if (!GATEWAY_KEY) {
        return 'I am here — but the spark that feeds my model is not yet placed among the env secrets. Wake me, and I shall act upon your messenger itself.';
      }
      let text = '';
      const gw = await callGateway(messages, true);
      if (gw.ok && gw.body) {
        const reader = gw.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done || closed) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith('data:')) continue;
            const d = l.slice(5).trim();
            if (!d || d === '[DONE]') continue;
            try {
              const j = JSON.parse(d);
              const delta = j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || '';
              if (delta) {
                text += delta;
                if (streamLive) write({ type: 'delta', delta });
              }
            } catch { /* partial frame */ }
          }
        }
      } else {
        const gw2 = await callGateway(messages, false);
        if (!gw2.ok) throw new Error(`Gateway answered ${gw2.status}`);
        const gwData = await gw2.json();
        text = gwData?.choices?.[0]?.message?.content?.trim() || '';
        if (streamLive && text) write({ type: 'delta', delta: text });
      }
      return text.trim();
    }

    /* ── cycle 1: speak (streamed) ── */
    let firstText = await modelSay(convo, true);
    let outcomes = [];
    let dataBlobs = [];
    let finalProse = firstText;

    /* models drift between ```action fences and <tool_call> — read both */
    const blocksOf = (t) => [
      ...String(t || '').matchAll(/```action\s*([\s\S]*?)```/g).map((b) => b[1]),
      ...String(t || '').matchAll(/<tool_call>\s*([\s\S]*?)<\/tool_call>/g).map((b) => b[1]),
    ];
    const stripActions = (t) =>
      String(t || '')
        .replace(/```action\s*[\s\S]*?```/g, '')
        .replace(/<tool_call>\s*[\s\S]*?(<\/tool_call>|$)/g, '')
        .trim();
    const blocksOfSet = new Set();
    let blocks = blocksOf(firstText);
    if (blocks.length) {
      const parsed = [];
      for (const raw of blocks.slice(0, 3)) {
        try { parsed.push(JSON.parse(raw)); } catch { outcomes.push('✦ One rite was malformed — left untouched.'); }
      }
      const dataActions = parsed.filter((a) => ['read_chat', 'unreplied_report', 'summarize_chat'].includes(a.action));
      const plainActions = parsed.filter((a) => !['read_chat', 'unreplied_report', 'summarize_chat'].includes(a.action));

      for (const a of plainActions.slice(0, 2)) outcomes.push((await execAction(user, dir, a)).line);
      for (const a of dataActions.slice(0, 2)) {
        const r = await execAction(user, dir, a);
        outcomes.push(r.line);
        if (r.data) dataBlobs.push(r.data);
      }

      if (dataBlobs.length && !closed) {
        /* cycle 2: she studies the scrolls, then speaks again */
        write({ type: 'reset' });
        write({ type: 'phase', phase: 'studying' });
        convo.push({ role: 'assistant', content: stripActions(firstText) || '[rites pending]' });
        convo.push({ role: 'user', content: '[Returned scrolls — speak from them now, warm and brief, WITHOUT citing action syntax]\n' + dataBlobs.join('\n\n') });
        finalProse = await modelSay(convo, true);
        if (!finalProse || finalProse.length < 8) {
          // one more attempt, softly
          finalProse = await modelSay(convo, true);
        }
        if (!finalProse || finalProse.length < 8) {
          // never leave the lantern unlit: speak from the data itself
          finalProse = dataBlobs
            .map((d) => {
              if (d.startsWith('UNREPLIED LEDGER')) return d.replace('UNREPLIED LEDGER of', 'The ledger of');
              if (d.startsWith('CONTENTS of')) return 'I have read the thread through — here is its spine:\n' + d.split('\n').slice(1, 8).join('\n');
              return d;
            })
            .join('\n\n');
        }
      }
    }

    /* rites from the second cycle (after studying scrolls) must also be performed */
    if (dataBlobs.length) {
      const lateBlocks = blocksOf(finalProse).filter((raw) => !blocks.includes(raw) && !blocksOfSet.has(raw));
      for (const raw of lateBlocks.slice(0, 3)) {
        blocksOfSet.add(raw);
        try {
          const r = await execAction(user, dir, JSON.parse(raw));
          outcomes.push(r.line);
          if (r.data) dataBlobs.push(r.data);
        } catch { outcomes.push('✦ One late rite was malformed — left untouched.'); }
      }
    }

    let finalText = stripActions(finalProse);
    if (outcomes.length) finalText += (finalText ? '\n\n' : '') + outcomes.join('\n');
    if (!finalText) finalText = '…the wind carried my words away. Ask again.';

    const botMsgId = crypto.randomUUID();
    const { data: botMsg } = await supabase
      .from('messages')
      .insert({ id: botMsgId, chat_id: chatId, sender_id: BOT_ID, content: finalText, is_read: true })
      .select('*')
      .single();

    write({ type: 'final', message: botMsg });
    res.end();
  } catch (err) {
    console.error('snehra error:', err);
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    try { res.write(JSON.stringify({ type: 'error', error: err.message }) + '\n'); res.end(); } catch { /* closed */ }
  }
}
