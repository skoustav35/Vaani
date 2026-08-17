import { AnimatePresence, motion } from 'framer-motion';
import { Feather } from 'lucide-react';
import { useChatUI } from '../store/chatStore';

export default function Toast() {
  const toast = useChatUI((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          initial={{ opacity: 0, y: 22, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-full ayur-glass px-5 py-3 shadow-lift">
            <Feather size={14} className="shrink-0 text-turmeric-deep dark:text-turmeric" />
            <p className="whitespace-nowrap font-serif text-[13.5px] text-charcoal dark:text-glow">{toast}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
