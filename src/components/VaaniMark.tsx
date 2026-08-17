/** Vaani wordmark — a veena string melting into a lotus. */
export default function VaaniMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="29" className="stroke-copper" strokeWidth="2" opacity="0.6" />
      <circle cx="32" cy="32" r="23" className="stroke-copper" strokeWidth="1" strokeDasharray="2.5 4.5" opacity="0.5" />
      {/* speech petal */}
      <path d="M18 20c5-3 9-3.6 14-3.6S41 17 46 20c-2.5 8-3 14-2 20-3.5 3-8 5-12 5s-8.5-2-12-5c1-6 .5-12-2-20Z" className="fill-neem dark:fill-midnight-700" />
      <path d="M32 24v18" className="stroke-turmeric" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M25 27c2.4-1.8 4.6-1.8 7 0s4.6 1.8 7 0" className="stroke-turmeric-soft" strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d="M27 34c1.6-1 3.4-1 5 0s3.4 1 5 0" className="stroke-turmeric-soft" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}
