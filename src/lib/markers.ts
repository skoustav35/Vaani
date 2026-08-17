/**
 * Invisible metadata markers carried INSIDE message.content — sentinels that
 * let us ship replies, forwards and edits without a schema migration.
 *
 *   §ed                      (suffix)  → message was edited
 *   §via§<text>              (prefix)  → written via Snehra
 *   §f§<fromTitle>\n<text>   (prefix)  → forwarded
 *   §r§<id>|<name>|<excerpt>\n<text>   (prefix)  → reply-quote
 */

export interface ReplyRef { id: string; name: string; excerpt: string }

export interface ParsedContent {
  text: string;
  edited: boolean;
  viaSnehra: boolean;
  forwardFrom: string | null;
  reply: ReplyRef | null;
}

export function parseContent(raw: string | null | undefined): ParsedContent {
  let content = raw || '';
  const out: ParsedContent = { text: content, edited: false, viaSnehra: false, forwardFrom: null, reply: null };

  if (/\s*§ed$/.test(content)) {
    out.edited = true;
    content = content.replace(/\s*§ed$/, '');
  }
  if (content.startsWith('§via§')) {
    out.viaSnehra = true;
    content = content.slice(5);
  }
  const rMatch = content.match(/^§r§([^|]*)\|([^|\n]*)\|([^\n]*)\n([\s\S]*)$/);
  if (rMatch) {
    out.reply = { id: rMatch[1], name: rMatch[2], excerpt: rMatch[3] };
    content = rMatch[4];
  }
  const fMatch = content.match(/^§f§([^\n]*)\n([\s\S]*)$/);
  if (fMatch) {
    out.forwardFrom = fMatch[1];
    content = fMatch[2];
  }
  out.text = content;
  return out;
}

export function oneLineExcerpt(text: string, max = 72): string {
  const flat = text.replace(/\s+/g, ' ').replace(/§/g, '').trim();
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat;
}

export function buildReply(body: string, ref: ReplyRef): string {
  return `§r§${ref.id}|${ref.name}|${oneLineExcerpt(ref.excerpt)}\n${body}`;
}

export function buildForward(body: string, fromTitle: string): string {
  return `§f§${fromTitle}\n${body}`;
}

export const EDIT_MARK = ' §ed';

export function stripEditMark(raw: string): string {
  return raw.replace(/\s*§ed$/, '');
}
