import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function MediaLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-midnight-900/85 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.img
        src={url}
        alt="shared media"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="max-h-[86vh] max-w-full rounded-2xl border-2 border-copper/50 shadow-lift"
      />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full ayur-glass text-copper dark:text-glow"
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </motion.div>
  );
}
