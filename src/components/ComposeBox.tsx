import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Paperclip, Pencil, Reply, Send, Sparkles, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useChatUI } from '../store/chatStore';
import type { ChatSummary, UiMessage } from '../lib/chatTypes';
import { parseContent, oneLineExcerpt } from '../lib/markers';

export type ComposeContext =
  | { kind: 'reply'; id: string; name: string; excerpt: string }
  | { kind: 'edit'; msg: UiMessage }
  | null;

interface Props {
  chat: ChatSummary;
  context: ComposeContext;
  onClearContext: () => void;
  onSend: (content: string, mediaUrl: string | null) => Promise<void>;
  onEditSend: (msgId: string, content: string) => Promise<void>;
  onTyping: () => void;
  onFocusInput?: () => void;
}

export default function ComposeBox({ chat, context, onClearContext, onSend, onEditSend, onTyping, onFocusInput }: Props) {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<{ name: string; url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const showToast = useChatUI((s) => s.showToast);

  const editing = context?.kind === 'edit';

  /* seed the composer when an edit begins */
  useEffect(() => {
    if (context?.kind === 'edit') {
      setText(parseContent(context.msg.content).text);
      setPendingFile(null);
      taRef.current?.focus();
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (ta) { ta.style.height = '0px'; ta.style.height = Math.min(ta.scrollHeight, 132) + 'px'; }
      });
    }
  }, [context]);

  const canPost = (text.trim().length > 0 || (!!pendingFile && !editing)) && !sending && !uploading;
  const channelMuted = chat.type === 'channel' && chat.my_role === 'member';

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Only images may enter the Bhandar for now'); return; }
    if (file.size > 8 * 1024 * 1024) { showToast('Image must be under 8 MB'); return; }

    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await apiFetch<{ url: string }>('/api/chat/upload', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileBase64: base64, contentType: file.type }),
      });
      setPendingFile({ name: file.name, url, preview: URL.createObjectURL(file) });
      taRef.current?.focus();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'The offering failed');
    } finally {
      setUploading(false);
    }
  };

  const doSend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canPost) return;
    const content = text.trim();
    const media = pendingFile?.url ?? null;
    const ctx = context;
    setText('');
    setPendingFile(null);
    onClearContext();
    setSending(true);
    taRef.current?.focus();
    requestAnimationFrame(() => { if (taRef.current) taRef.current.style.height = ''; });
    try {
      if (ctx?.kind === 'edit') {
        await onEditSend(ctx.msg.id, content);
      } else {
        await onSend(content, media);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    if (e.key === 'Escape' && context) { e.preventDefault(); onClearContext(); }
  };

  const autoGrow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = Math.min(ta.scrollHeight, 132) + 'px';
  };

  if (channelMuted) {
    return (
      <div className="border-t copper-rule bg-cream/80 px-4 py-4 text-center backdrop-blur-sm dark:bg-midnight-800/80">
        <p className="font-serif text-[13.5px] italic text-charcoal-mute dark:text-glow-dim">
          Only the Acharya speaks in this Sangha. Listen with both ears.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={doSend} className="border-t copper-rule bg-cream/85 px-3 pt-2 backdrop-blur-sm dark:bg-midnight-800/85 sm:px-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      {/* context banner — reply or edit */}
      <AnimatePresence>
        {context && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-3 rounded-xl border border-turmeric/50 bg-turmeric/10 px-3.5 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-turmeric text-charcoal">
                {context.kind === 'edit' ? <Pencil size={13} /> : <Reply size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[11.5px] uppercase tracking-[0.16em] text-turmeric-deep dark:text-turmeric">
                  {context.kind === 'edit' ? 're-carving your words' : `whispering back to ${context.name}`}
                </p>
                <p className="truncate text-[12.5px] text-charcoal-soft dark:text-glow-dim">
                  {context.kind === 'edit' ? oneLineExcerpt(parseContent(context.msg.content).text) : context.excerpt}
                </p>
              </div>
              <button type="button" onClick={onClearContext} className="grid h-7 w-7 place-items-center rounded-full text-charcoal-mute transition hover:bg-red-800/10 hover:text-red-700" aria-label="Cancel">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* pending media chip */}
      <AnimatePresence>
        {pendingFile && !editing && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-2 inline-flex items-center gap-3 rounded-xl border border-copper-faint bg-sand-200/80 p-2 pr-2.5 dark:border-midnight-600 dark:bg-midnight-700"
          >
            <img src={pendingFile.preview} alt={pendingFile.name} className="h-12 w-12 rounded-lg object-cover" />
            <span className="max-w-[140px] truncate text-[12px] font-medium text-charcoal-soft dark:text-glow-dim">{pendingFile.name}</span>
            <button type="button" onClick={() => setPendingFile(null)} className="grid h-6 w-6 place-items-center rounded-full bg-copper/15 text-copper hover:bg-copper/25" aria-label="Remove image">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {!editing && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-copper/40 bg-cream text-copper transition hover:bg-sand-200 hover:shadow-turmeric disabled:opacity-50 dark:bg-midnight-700 dark:text-glow dark:hover:bg-midnight-600"
            aria-label="Attach an image"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        <div className={`relative flex-1 rounded-2xl border px-4 py-2.5 shadow-inner transition dark:shadow-none ${
          editing
            ? 'border-turmeric bg-turmeric/8 ring-2 ring-turmeric/25 dark:border-turmeric/60 dark:bg-midnight-900/90'
            : 'border-copper/35 bg-white/70 focus-within:border-turmeric focus-within:shadow-turmeric dark:border-midnight-600 dark:bg-midnight-900/90'
        }`}>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => { setText(e.target.value); autoGrow(); onTyping(); }}
            onFocus={() => onFocusInput?.()}
            onKeyDown={onKey}
            placeholder={
              editing
                ? 'Reshape the words…'
                : chat.is_snehra
                  ? 'Ask Snehra anything — she can act on your threads…'
                  : chat.is_bhandar
                    ? 'Keep something in the Bhandar…'
                    : `Message ${chat.title}…`
            }
            rows={1}
            className="slim-scroll max-h-[132px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-charcoal placeholder:text-charcoal-mute/70 focus:outline-none sm:text-[14.5px] dark:text-[#efe6d2] dark:placeholder:text-glow-dim/50"
            aria-label="Message"
          />
        </div>

        <motion.button
          type="submit"
          disabled={!canPost}
          whileTap={{ scale: 0.85 }}
          whileHover={canPost ? { scale: 1.06, rotate: -6 } : undefined}
          className={`mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-soft transition hover:shadow-turmeric disabled:opacity-40 ${
            chat.is_snehra && !editing ? 'bg-gradient-to-br from-turmeric to-copper text-charcoal' : 'bg-neem text-cream dark:bg-turmeric dark:text-charcoal'
          }`}
          aria-label={editing ? 'Save edit' : 'Send message'}
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : chat.is_snehra ? <Sparkles size={18} /> : <Send size={18} className="-ml-0.5 mt-0.5" />}
        </motion.button>
      </div>
      <p className="mt-1 hidden px-1 text-[10.5px] tracking-wide text-charcoal-mute/70 dark:text-glow-dim/60 sm:block">
        Enter to send · Shift + Enter for a new line{context ? ' · Esc to release the context' : ''}
      </p>
    </form>
  );
}
