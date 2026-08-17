import { motion } from 'framer-motion';

export default function TypingDots({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="mt-2 flex items-center gap-2"
    >
      <span className="font-serif text-[11px] italic text-copper dark:text-glow-dim">{name} is composing</span>
      <span className="bubble-other flex items-center gap-1 border border-copper-faint/70 bg-cream px-3 py-2 dark:border-midnight-600 dark:bg-midnight-800">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-copper dark:bg-glow"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
          />
        ))}
      </span>
    </motion.div>
  );
}
