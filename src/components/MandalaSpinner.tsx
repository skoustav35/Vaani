import { motion } from 'framer-motion';

/** The Khal-batta loader: a mortar-and-mandala, perpetually turning. */
export default function MandalaSpinner({ size = 54, label }: { size?: number; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 60 60"
        className="text-copper"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.6, ease: 'linear', repeat: Infinity }}
      >
        <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.8" />
        <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.6" />
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse key={i} cx="30" cy="13" rx="4.5" ry="9" fill="none" stroke="currentColor" strokeWidth="1.3" transform={`rotate(${i * 45} 30 30)`} opacity="0.85" />
        ))}
        <circle cx="30" cy="30" r="5" fill="currentColor" className="text-turmeric" opacity="0.95" />
      </motion.svg>
      {label && <p className="font-serif text-sm text-charcoal-soft dark:text-glow-dim">{label}</p>}
    </div>
  );
}

export function MandalaScreen({ label = 'Grinding herbs…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-sandalwood dark:bg-midnight">
      <MandalaSpinner size={64} label={label} />
    </div>
  );
}
