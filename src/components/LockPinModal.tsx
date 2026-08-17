import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, LockOpen } from 'lucide-react';
import { getMantra, setMantra, useChatUI } from '../store/chatStore';

interface Props {
  meId: string;
  onUnlocked: (chatId: string) => void;
}

/** The Mantra gate — a 4-digit PIN that seals away chosen threads. */
export default function LockPinModal({ meId, onUnlocked }: Props) {
  const lockPromptFor = useChatUI((s) => s.lockPromptFor);
  const askLockPin = useChatUI((s) => s.askLockPin);
  const unlockChat = useChatUI((s) => s.unlockChat);
  const showToast = useChatUI((s) => s.showToast);

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const existing = getMantra(meId);

  const close = () => { setPin(''); setError(''); askLockPin(null); };

  const lockChat = useChatUI((s) => s.lockChat);
  const locked = useChatUI((s) => s.locked);
  const target = lockPromptFor;
  const isUnlock = target ? locked.includes(target) : false;

  const submit = () => {
    if (!/^\d{4}$/.test(pin)) { setError('The mantra takes exactly four digits'); return; }
    if (!existing) {
      setMantra(meId, pin);
      close();
      if (isUnlock && target) {
        unlockChat(target);
        onUnlocked(target);
      } else if (target) {
        lockChat(target);
        showToast('A mantra is born — and the thread is sealed.');
        return;
      }
      showToast('A mantra is born. Guard it like a seed.');
      return;
    }
    if (pin === existing) {
      close();
      if (target) { unlockChat(target); onUnlocked(target); }
    } else {
      setError('Wrong mantra. The gate stays shut.');
      setPin('');
    }
  };

  return (
    <AnimatePresence>
      {lockPromptFor && (
        <div className="fixed inset-0 z-[75] grid place-items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-midnight-900/60 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative w-full max-w-xs rounded-3xl ayur-glass p-6 text-center shadow-lift"
          >
            <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-turmeric/15 text-turmeric-deep dark:text-turmeric">
              {existing ? <Lock size={22} /> : <LockOpen size={22} />}
            </motion.div>
            <h2 className="mt-3 font-serif text-lg text-neem-deep dark:text-glow">{existing ? 'Speak the mantra' : 'Forge your mantra'}</h2>
            <p className="mt-1 text-[12px] text-charcoal-mute dark:text-glow-dim">
              {existing ? 'Four digits stand between you and this sealed thread.' : 'This four-digit mantra will seal every thread you lock. It lives only on this device.'}
            </p>
            {!existing && !isUnlock && <p className="mt-1 text-[11px] font-medium text-turmeric-deep dark:text-turmeric">This thread will lock once the mantra is forged.</p>}
            <input
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              inputMode="numeric"
              autoFocus
              placeholder="• • • •"
              className="mt-4 w-full rounded-2xl border border-copper/40 bg-white/70 py-3 text-center font-mono text-2xl tracking-[0.6em] text-charcoal placeholder:tracking-[0.5em] focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-800 dark:text-glow"
            />
            <AnimatePresence>
              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-[12px] font-medium text-red-700 dark:text-red-300">{error}</motion.p>}
            </AnimatePresence>
            <div className="mt-1 flex justify-center gap-1.5 py-3">
              {[0, 1, 2, 3].map((i) => (
                <motion.span key={i} animate={{ scale: pin.length > i ? 1.25 : 1 }} className={`h-2.5 w-2.5 rounded-full transition-colors ${pin.length > i ? 'bg-turmeric shadow-turmeric' : 'bg-sand-300 dark:bg-midnight-600'}`} />
              ))}
            </div>
            <button onClick={submit} className="w-full rounded-xl bg-neem py-3 font-serif text-[15px] text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric dark:bg-turmeric dark:text-charcoal">
              {existing ? 'Unseal the thread' : 'Forge the mantra'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
