import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MessageCircle, Pencil, Scroll, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { BootstrapPayload, ChatUser } from '../lib/chatTypes';
import { presenceLabel, presenceOf } from '../lib/chatTypes';
import { useChatUI } from '../store/chatStore';
import { useQueryClient } from '@tanstack/react-query';

/** The visiting card — any soul's face, name, aura and current bhava. */
export default function ProfileCard({ me }: { me: ChatUser }) {
  const viewProfileId = useChatUI((s) => s.viewProfileId);
  const viewProfile = useChatUI((s) => s.viewProfile);
  const openChat = useChatUI((s) => s.openChat);
  const setNiyamOpen = useChatUI((s) => s.setNiyamOpen);
  const showToast = useChatUI((s) => s.showToast);
  const qc = useQueryClient();

  const { data: person, isLoading } = useQuery({
    queryKey: ['vaani', 'profile', viewProfileId],
    enabled: !!viewProfileId,
    queryFn: () => apiFetch<ChatUser>(`/api/chat/users?id=${viewProfileId}`),
    staleTime: 15_000,
  });
  const isMe = viewProfileId === me.id;

  const message = async () => {
    if (!person || isMe) return;
    try {
      const r = await apiFetch<{ chat_id: string }>('/api/chat/dm', { method: 'POST', body: JSON.stringify({ user_id: person.id }) });
      await qc.invalidateQueries({ queryKey: ['vaani', 'bootstrap'] });
      viewProfile(null);
      openChat(r.chat_id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'The thread could not open');
    }
  };

  const presence = presenceOf(person?.last_seen);

  return (
    <AnimatePresence>
      {viewProfileId && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-midnight-900/60 backdrop-blur-sm" onClick={() => viewProfile(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] ayur-glass shadow-lift"
          >
            {/* ceremonial band */}
            <div className="relative h-24 overflow-hidden bg-gradient-to-br from-neem via-neem-deep to-midnight-900">
              <svg viewBox="0 0 400 90" className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="none">
                {Array.from({ length: 9 }).map((_, i) => (
                  <path key={i} d={`M ${i * 50 - 20} 90 Q ${i * 50 + 5} ${20 + (i % 3) * 14} ${i * 50 + 30} 90`} stroke="#f0b90b" strokeWidth="1.2" fill="none" />
                ))}
              </svg>
              <button onClick={() => viewProfile(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-midnight-900/40 text-cream/90 transition hover:bg-midnight-900/70" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {/* avatar crest */}
            <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
              <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }} className="relative">
                <div className="rounded-full bg-[conic-gradient(from_210deg,#b87333,#f0b90b,#2c5f2d,#b87333)] p-[3.5px] shadow-lift">
                  <div className="rounded-full border-4 border-cream dark:border-midnight-800">
                    {isLoading || !person ? (
                      <div className="grid h-24 w-24 place-items-center rounded-full bg-sand-200 dark:bg-midnight-700"><Loader2 className="animate-spin text-copper" /></div>
                    ) : person.avatar_url ? (
                      <img src={person.avatar_url} alt={person.display_name} className="h-24 w-24 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-24 w-24 place-items-center rounded-full bg-neem font-serif text-3xl text-cream">
                        {person.display_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                    )}
                  </div>
                </div>
                {person?.status?.emoji && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 420, damping: 15 }} className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-cream bg-turmeric text-base shadow-turmeric dark:border-midnight-800">
                    {person.status.emoji}
                  </motion.span>
                )}
              </motion.div>

              {isLoading || !person ? (
                <div className="mt-4 h-5 w-40 animate-pulse rounded bg-sand-200 dark:bg-midnight-700" />
              ) : (
                <>
                  <h3 className="mt-3.5 font-serif text-[22px] leading-tight text-neem-deep dark:text-glow">{person.display_name}</h3>
                  <p className="mt-0.5 font-mono text-[12px] text-charcoal-mute dark:text-glow-dim">@{person.username}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-charcoal-soft dark:text-glow-dim">
                    <span className={`h-2 w-2 rounded-full ${presence === 'online' ? 'bg-neem-loud animate-breathe' : 'bg-sand-400 dark:bg-midnight-600'}`} />
                    {presenceLabel(person.last_seen)}
                  </p>

                  <AnimatePresence>
                    {person.status && (person.status.text || person.status.emoji) && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 w-full rounded-2xl border border-turmeric/45 bg-turmeric/10 px-4 py-3 dark:bg-turmeric/5"
                      >
                        <p className="font-serif text-[10px] uppercase tracking-[0.24em] text-turmeric-deep dark:text-turmeric">bhava — her present wind</p>
                        <p className="mt-1 text-[14px] leading-snug text-charcoal dark:text-[#efe6d2]">
                          {person.status.emoji} <span className="font-medium">{person.status.text || '…in quiet practice'}</span>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {person.phone_number && (
                    <p className="mt-3.5 rounded-full bg-sand-200 px-4 py-1.5 font-mono text-[11.5px] text-charcoal-soft dark:bg-midnight-700 dark:text-glow-dim">{person.phone_number}</p>
                  )}

                  <div className="mt-5 flex w-full gap-2.5">
                    {isMe ? (
                      <button
                        onClick={() => { viewProfile(null); setNiyamOpen(true); }}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neem py-3 font-serif text-[14.5px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric dark:bg-turmeric dark:text-charcoal"
                      >
                        <Pencil size={14} /> Amend in Niyam
                      </button>
                    ) : (
                      <button
                        onClick={message}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neem py-3 font-serif text-[14.5px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric dark:bg-turmeric dark:text-charcoal"
                      >
                        <MessageCircle size={15} /> Whisper to them
                      </button>
                    )}
                  </div>
                  {!isMe && (
                    <p className="mt-3 flex items-center gap-1.5 text-[10.5px] tracking-wide text-charcoal-mute/80 dark:text-glow-dim/70">
                      <Scroll size={10} /> a fellow keeper of the Vaani court
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
