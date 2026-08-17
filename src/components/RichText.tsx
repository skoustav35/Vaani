import type { ReactNode } from 'react';

const LINK_RE = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]\]])/g;

function linkPart(seg: string, kb: string, out: ReactNode[]) {
  seg.split(LINK_RE).forEach((part, i) => {
    if (LINK_RE.test(part)) {
      out.push(
        <a key={`${kb}L${i}`} href={part} target="_blank" rel="noreferrer"
          className="font-semibold underline decoration-turmeric/70 decoration-2 underline-offset-2 hover:decoration-turmeric"
          onClick={(e) => e.stopPropagation()}>
          {part}
        </a>
      );
    } else if (part) {
      out.push(part);
    }
  });
}

function italicPart(seg: string, kb: string, out: ReactNode[]) {
  seg.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).forEach((chunk, i) => {
    if (!chunk) return;
    if (/^\*[^*\n]+\*$/.test(chunk) || /^_[^_\n]+_$/.test(chunk)) {
      const inner: ReactNode[] = [];
      linkPart(chunk.slice(1, -1), `${kb}i${i}`, inner);
      out.push(<em key={`${kb}I${i}`} className="italic">{inner}</em>);
    } else {
      linkPart(chunk, `${kb}p${i}`, out);
    }
  });
}

function boldPart(seg: string, kb: string, out: ReactNode[]) {
  seg.split(/(\*\*[^*]+\*\*)/g).forEach((chunk, i) => {
    if (!chunk) return;
    if (/^\*\*[^*]+\*\*$/.test(chunk)) {
      const inner: ReactNode[] = [];
      italicPart(chunk.slice(2, -2), `${kb}b${i}`, inner);
      out.push(<strong key={`${kb}B${i}`} className="font-semibold">{inner}</strong>);
    } else {
      italicPart(chunk, `${kb}p${i}`, out);
    }
  });
}

/** Live markdown-lite: inline code, bold, italic and links — safe to re-render every token. */
export default function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  text.split(/`([^`\n]+)`/g).forEach((piece, i) => {
    if (i % 2 === 1) {
      parts.push(
        <code key={`c${i}`} className="rounded-md border border-sand-300/70 bg-sand-100 px-1.5 py-0.5 font-mono text-[0.85em] text-copper-deep dark:border-midnight-600 dark:bg-midnight-700 dark:text-turmeric-soft">
          {piece}
        </code>
      );
    } else if (piece) {
      boldPart(piece, `seg${i}`, parts);
    }
  });
  return <>{parts}</>;
}

/** While streaming: never flash a half-formed rite fence at the user. */
export function streamSafe(text: string): string {
  const fences = [text.indexOf('```'), text.indexOf('<tool_call')].filter((i) => i >= 0);
  if (!fences.length) return text;
  return text.slice(0, Math.min(...fences));
}
