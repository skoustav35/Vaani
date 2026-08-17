import { presenceOf } from '../lib/chatTypes';

interface Props {
  src?: string | null;
  name: string;
  size?: number;
  /** ISO last_seen — renders the prana dot when supplied */
  lastSeen?: string | null;
  ring?: boolean;
}

export default function Avatar({ src, name, size = 44, lastSeen, ring = true }: Props) {
  const presence = presenceOf(lastSeen);
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`h-full w-full overflow-hidden rounded-full ${ring ? 'p-[2.5px] bg-[conic-gradient(from_200deg,#b87333,#f0b90b,#2c5f2d,#b87333)]' : ''}`}
      >
        {src ? (
          <img src={src} alt={name} width={size} height={size} loading="lazy" className="h-full w-full rounded-full border-2 border-cream bg-sand-200 object-cover dark:border-midnight-800 dark:bg-midnight-700" />
        ) : (
          <div className="grid h-full w-full place-items-center rounded-full border-2 border-cream bg-neem text-cream dark:border-midnight-800" style={{ fontSize: size * 0.34 }}>
            <span className="font-serif leading-none">{initials}</span>
          </div>
        )}
      </div>
      {lastSeen !== undefined && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full border-2 border-cream transition-colors dark:border-midnight-800 ${presence === 'online' ? 'bg-neem-loud' : 'bg-sand-400 dark:bg-midnight-600'}`}
          style={{ width: Math.max(11, size * 0.26), height: Math.max(11, size * 0.26) }}
          aria-label={presence}
        />
      )}
    </div>
  );
}
