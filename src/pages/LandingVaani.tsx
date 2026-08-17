import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Archive, Forward, Lock, Mail, Megaphone, MessageCircleHeart, Mic2, Pencil, Pin, Reply, Search, Sparkles, Zap,
} from 'lucide-react';
import VaaniMark from '../components/VaaniMark';
import GoogleIcon from '../components/GoogleIcon';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── the self-playing demo conversation ───────────────────────── */
const DEMO_SCRIPT: { from: 'me' | 'them' | 'ai'; text: string }[] = [
  { from: 'them', text: 'Did the monsoon reach the ghats yet? 🌧' },
  { from: 'me', text: 'This morning. The whole fort smelled of wet basalt.' },
  { from: 'ai', text: '✦ Carried your reply into “Sahyadri Trek Crew”.' },
  { from: 'them', text: 'And the lamp frames — did you forward them?' },
  { from: 'me', text: 'Forwarded to The Rasa Family. One tap, out of the water-drop spring.' },
];

function PhoneDemo() {
  return (
    <div className="relative mx-auto w-[300px] rounded-[34px] border-[3px] border-copper/50 bg-midnight-900 p-2.5 shadow-lift sm:w-[320px]">
      <div className="overflow-hidden rounded-[26px] chat-weave bg-sandalwood">
        {/* notch */}
        <div className="flex items-center gap-2 border-b copper-rule bg-cream/95 px-4 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-turmeric to-copper text-charcoal"><Sparkles size={14} /></div>
          <div>
            <p className="font-serif text-[13px] leading-none text-neem-deep">The Rasa Family</p>
            <p className="mt-1 text-[10px] text-turmeric-deep">Snehra is composing…</p>
          </div>
        </div>
        <DemoScript />
        <div className="flex items-center gap-2 border-t copper-rule bg-cream/90 px-3 py-2.5">
          <div className="flex-1 rounded-full bg-white/80 px-4 py-2 text-[11px] text-charcoal-mute">Message…</div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-neem text-cream"><ArrowRight size={13} /></div>
        </div>
      </div>
    </div>
  );
}

function DemoScript() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    let i = 0;
    let dead = false;
    const tick = () => {
      if (dead || !el) return;
      const m = DEMO_SCRIPT[i % DEMO_SCRIPT.length];
      i++;
      const row = document.createElement('div');
      row.className = `flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`;
      row.style.opacity = '0';
      row.style.transform = 'translateY(10px) scale(0.92)';
      row.style.transition = 'all 0.45s cubic-bezier(0.22,1,0.36,1)';
      row.innerHTML = `<div style="max-width:82%;padding:7px 11px;font-size:11px;line-height:1.5;box-shadow:0 1px 4px rgba(26,26,26,.12);${
        m.from === 'me'
          ? 'background:#2c5f2d;color:#efe9d2;border-radius:14px 14px 5px 14px;'
          : m.from === 'ai'
            ? 'background:#f0b90b22;color:#8a5322;border:1px solid #b8733355;border-radius:14px 14px 14px 5px;font-style:italic;'
            : 'background:#fbf6e4;color:#1a1a1a;border:1px solid #b8733344;border-radius:14px 14px 14px 5px;'
      }">${m.text}</div>`;
      el.appendChild(row);
      requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = 'none'; });
      el.scrollTop = el.scrollHeight;
      if (el.children.length > 5) el.removeChild(el.children[0]);
      timer = setTimeout(tick, 1700);
    };
    let timer = setTimeout(tick, 700);
    return () => { dead = true; clearTimeout(timer); };
  }, []);
  return <div ref={box} className="no-scrollbar h-[320px] space-y-2 overflow-hidden px-3 py-3" />;
}

/* ── content ──────────────────────────────────────────────────── */
const PILLARS = [
  { icon: Zap, title: 'Realtime by design', body: 'Water-drop springs, typing whispers, turmeric read-ticks and presence dots — streamed live over Postgres, healed by a gentle cadence. It feels like silk moving.', accent: 'from-neem to-neem-deep' },
  { icon: Megaphone, title: 'Sakhis, Circles, Sanghas', body: 'Direct threads, hand-joined circles, and one-way Sanghas where only the Acharya speaks. Bhandar keeps your private scrolls; the mantra seal hides what must stay hidden.', accent: 'from-copper to-turmeric' },
  { icon: Sparkles, title: 'Snehra lives inside', body: 'A resident intelligence — Snehra-6.7-Ultra, crafted locally for this ashram. She does not merely answer: she kindles circles, carries messages, re-carves words, carries them away.', accent: 'from-turmeric to-copper-soft' },
];

const FEATURES = [
  { icon: Reply, t: 'Reply threads', d: 'Quoted whisper-blocks that jump back to their origin.' },
  { icon: Forward, t: 'Onward forwarding', d: 'Carry words to many threads with one flourish.' },
  { icon: Pencil, t: 'Re-carving', d: 'Edit any message of yours; an elegant “edited” seal marks the change.' },
  { icon: MessageCircleHeart, t: 'Gentle deletion', d: 'Messages are carried away by the wind — for authors and guardians.' },
  { icon: Archive, t: 'The Bhandar', d: 'Your private storeroom for notes, links and lamps worth keeping.' },
  { icon: Lock, t: 'Mantra seals', d: 'Lock any thread behind a four-digit mantra held on your device.' },
  { icon: Pin, t: 'Ridge pins', d: 'Keep beloved threads pinned above the river’s churn.' },
  { icon: Search, t: 'Thread search', d: 'Summoning words from deep inside any conversation.' },
  { icon: Mic2, t: 'Sangha channels', d: 'Broadcast-style wisdom streams for acharyas and archivists.' },
  { icon: Sparkles, t: 'Autonomous Snehra', d: '“Carry this to Vikram” — and it is done, not described.' },
];

export default function LandingVaani() {
  const { user } = useAuth();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const mY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-dvh overflow-x-clip bg-sandalwood text-charcoal">
      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5 rounded-full ayur-glass px-4 py-2 shadow-soft">
            <VaaniMark size={30} />
            <span className="font-serif text-lg text-neem-deep">Vaani</span>
            <span className="hidden rounded-full bg-turmeric/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-turmeric-deep sm:block">made in Bharat</span>
          </div>
          <Link to={user ? '/app' : '/login'} className="rounded-full border border-copper/40 bg-cream px-5 py-2.5 text-[13px] font-semibold text-neem shadow-soft transition hover:border-turmeric hover:shadow-turmeric">
            {user ? 'Open Vaani' : 'Enter quietly'}
          </Link>
        </div>
      </header>

      {/* hero */}
      <section ref={heroRef} className="relative flex min-h-dvh items-center overflow-hidden pt-24">
        <motion.div style={{ y: mY, opacity: fade }} className="pointer-events-none absolute -right-[26vmin] top-1/2 -translate-y-1/2 opacity-30">
          <svg viewBox="-500 -500 1000 1000" className="h-[96vmin] w-[96vmin] animate-mandala-spin text-copper" style={{ animationDuration: '90s' }}>
            {[440, 380, 300, 210, 120].map((r, i) => (
              <circle key={r} r={r} fill="none" stroke="currentColor" strokeWidth={i % 2 ? 1 : 2} strokeDasharray={i === 1 ? '3 9' : undefined} />
            ))}
            {Array.from({ length: 24 }).map((_, i) => (
              <ellipse key={i} cx="0" cy="-335" rx="26" ry="62" fill="none" stroke="currentColor" strokeWidth="1.3" transform={`rotate(${i * 15})`} />
            ))}
          </svg>
        </motion.div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 rounded-full border border-turmeric/50 bg-turmeric/10 px-4 py-1.5 font-serif text-[11px] uppercase tracking-[0.30em] text-turmeric-deep">
              <Sparkles size={12} /> a messenger from our own soil
            </motion.p>
            <h1 className="mt-6 font-serif text-[13vw] leading-[1.03] text-neem-deep sm:text-7xl">
              {['Speak gently.', 'Arrive instantly.'].map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: '108%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, delay: 0.18 + i * 0.14, ease: EASE }}
                  >
                    {i === 1 ? <span className="text-gilaki-gold">{line}</span> : line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }} className="mt-6 max-w-lg text-[16px] leading-relaxed text-charcoal-soft">
              Vaani is India&rsquo;s own real-time messenger — Telegram-swift, yet dressed in neem, turmeric,
              copper and sandalwood. Sakhis to whisper with, Circles to gather in, Sanghas to broadcast wisdom,
              a Bhandar to keep treasures — and <span className="font-semibold text-copper-deep">Snehra</span>, a resident intelligence, to act on your word.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.76 }} className="mt-9 flex flex-wrap gap-3.5">
              <button onClick={() => signInWithGoogle('Vaani')} className="group flex items-center gap-2.5 rounded-full bg-neem px-6 py-3.5 text-[14px] font-semibold text-cream shadow-lift transition hover:bg-neem-deep hover:shadow-turmeric">
                <GoogleIcon size={17} /> Continue with Google
              </button>
              <Link to={user ? '/app' : '/login'} className="group flex items-center gap-2 rounded-full border border-copper/45 bg-cream px-6 py-3.5 text-[14px] font-semibold text-turmeric-deep shadow-soft transition hover:border-turmeric hover:shadow-turmeric">
                <Mail size={16} /> {user ? 'Open the ashram' : 'By email'}
                <ArrowRight size={14} className="transition group-hover:translate-x-1" />
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-charcoal-mute">
              {['Realtime presence', 'Read receipts', 'Mantra locks', 'Autonomous AI'].map((s) => (
                <span key={s} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-turmeric" />{s}</span>
              ))}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 70 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.5, ease: EASE }} className="relative hidden lg:block">
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}>
              <PhoneDemo />
            </motion.div>
            <motion.div animate={{ y: [0, 10, 0], rotate: -4 }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -left-16 top-12 w-52 rounded-2xl ayur-glass p-4 shadow-lift">
              <p className="flex items-center gap-1.5 font-serif text-[10px] uppercase tracking-[0.2em] text-turmeric-deep"><Lock size={11} /> mantra sealed</p>
              <p className="mt-1.5 font-serif text-[13px] italic text-charcoal-soft">“Locked threads hum softly, seen by none.”</p>
            </motion.div>
            <motion.div animate={{ y: [0, -8, 0], rotate: 3 }} transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }} className="absolute -right-8 bottom-14 w-56 rounded-2xl bg-neem p-4 text-cream shadow-lift">
              <p className="font-serif text-[10px] uppercase tracking-[0.2em] text-turmeric-soft">snehra-6.7-ultra</p>
              <p className="mt-1 text-[12.5px] leading-relaxed">✦ Kindled the circle “Rasa Evening”, with @saraswati_i and @ananya_d called in.</p>
            </motion.div>
          </motion.div>
        </div>

        <motion.div style={{ opacity: fade }} className="absolute bottom-7 left-1/2 -translate-x-1/2">
          <div className="flex h-12 w-7 items-start justify-center rounded-full border-2 border-copper/40 p-1.5">
            <motion.span className="h-2 w-2 rounded-full bg-turmeric" animate={{ y: [0, 18, 0], opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
          </div>
        </motion.div>
      </section>

      {/* pillars */}
      <section className="border-t copper-rule bg-cream/60 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: EASE }} className="text-center">
            <p className="font-serif text-[11px] uppercase tracking-[0.32em] text-turmeric-deep">the three pillars</p>
            <h2 className="mt-3 font-serif text-4xl text-neem-deep sm:text-5xl">Ancient warmth, <span className="text-gilaki-gold">modern wings</span></h2>
          </motion.div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 40, rotate: i === 1 ? 0 : i === 0 ? -1.5 : 1.5 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: EASE }}
                whileHover={{ y: -8 }}
                className="relative overflow-hidden rounded-3xl border border-copper/25 bg-sandalwood p-7 shadow-soft"
              >
                <div className={`inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.accent} text-cream shadow-soft`}>
                  <p.icon size={20} />
                </div>
                <h3 className="mt-5 font-serif text-[22px] text-neem-deep">{p.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-charcoal-soft">{p.body}</p>
                <svg className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 text-copper/15" viewBox="0 0 100 100">
                  {[16, 28, 40].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="2" />)}
                </svg>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* feature garland */}
      <section className="border-t copper-rule py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center">
            <p className="font-serif text-[11px] uppercase tracking-[0.32em] text-turmeric-deep">a garland of capabilities</p>
            <h2 className="mt-3 font-serif text-4xl text-neem-deep sm:text-5xl">Everything a messenger should do —<br className="hidden sm:block" /> and then a little more</h2>
          </motion.div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.t}
                initial={{ opacity: 0, y: 26, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: (i % 5) * 0.07, ease: EASE }}
                whileHover={{ y: -5, boxShadow: '0 4px 24px -4px rgba(240,185,11,0.45)' }}
                className="rounded-2xl border border-copper/25 bg-cream p-5 shadow-soft"
              >
                <f.icon size={19} className="text-copper-deep" />
                <p className="mt-3 font-serif text-[15.5px] text-neem-deep">{f.t}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-charcoal-mute">{f.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* snehra band */}
      <section className="relative overflow-hidden border-t copper-rule bg-midnight py-24 text-cream">
        <svg viewBox="-500 -500 1000 1000" className="pointer-events-none absolute -left-[24vmin] top-1/2 h-[90vmin] w-[90vmin] -translate-y-1/2 animate-mandala-spin opacity-10" style={{ animationDuration: '70s' }}>
          {[420, 330, 230, 130].map((r, i) => <circle key={r} r={r} fill="none" stroke="#f0b90b" strokeWidth={i % 2 ? 1.2 : 2} />)}
          {Array.from({ length: 20 }).map((_, i) => (
            <ellipse key={i} cx="0" cy="-290" rx="25" ry="58" fill="none" stroke="#f0b90b" strokeWidth="1.3" transform={`rotate(${i * 18})`} />
          ))}
        </svg>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease: EASE }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-turmeric/40 bg-turmeric/10 px-4 py-1.5 font-serif text-[11px] uppercase tracking-[0.3em] text-turmeric">
              <Sparkles size={12} /> the resident intelligence
            </p>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">Snehra acts.<br /><span className="text-turmeric-soft">She does not merely advise.</span></h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-sand-200/85">
              Powered by <span className="font-semibold text-turmeric">Snehra-6.7-Ultra</span> — a locally-crafted model running inside the ashram — she performs rites on your messenger itself: kindle circles, summon members by name, carry your words to other threads, re-carve or retire messages. Type it, and it is done.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {['kindle a circle with vikram_s', 'carry this to Rasa Family', 'delete my last message there', 'rename my word in Trek Crew'].map((c, i) => (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 * i, duration: 0.5 }}
                  className="rounded-full border border-turmeric/30 bg-midnight-800 px-4 py-2 font-mono text-[11px] text-turmeric-soft"
                >
                  “{c}”
                </motion.span>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease: EASE }} className="rounded-3xl border border-turmeric/25 bg-midnight-800/80 p-6 shadow-lift backdrop-blur">
            <div className="space-y-3">
              <div className="bubble-self ml-auto w-fit max-w-[85%] bg-neem px-4 py-2.5 text-[13px] text-[#efe9d2] shadow-soft">Snehra, kindle a circle named “Monsoon Photographers” and call in ishaan_k and arjun</div>
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 25 }} className="bubble-other w-fit max-w-[90%] border border-turmeric/30 bg-midnight-700 px-4 py-2.5 text-[13px] text-sand-100 shadow-soft">
                <p className="font-serif text-[10px] uppercase tracking-[0.2em] text-turmeric">snehra · snehra-6.7-ultra</p>
                <p className="mt-1">It is done. ✦ Kindled the circle “Monsoon Photographers” with @ishaan_k. The other soul you named walks no registered thread yet — invite them first, and I shall call them in.</p>
              </motion.div>
              <div className="flex justify-end text-[10px] text-sand-200/50">✓✓ read · just now</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* finale CTA */}
      <section className="relative overflow-hidden border-t border-turmeric/20 py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_380px_at_50%_120%,rgba(240,185,11,0.16),transparent_65%)]" />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} className="relative mx-auto max-w-2xl px-5 text-center">
          <VaaniMark size={54} />
          <h2 className="mt-5 font-serif text-4xl leading-tight text-neem-deep sm:text-5xl">The court is lit.<br /><span className="text-gilaki-gold">Come, take your thread.</span></h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <button onClick={() => signInWithGoogle('Vaani')} className="flex items-center gap-2.5 rounded-full bg-neem px-7 py-3.5 text-[14px] font-semibold text-cream shadow-lift transition hover:bg-neem-deep hover:shadow-turmeric">
              <GoogleIcon size={17} /> Continue with Google
            </button>
            <Link to={user ? '/app' : '/login'} className="flex items-center gap-2 rounded-full border border-copper/50 bg-cream px-7 py-3.5 text-[14px] font-semibold text-turmeric-deep shadow-soft transition hover:shadow-turmeric">
              <Mail size={16} /> By email
            </Link>
          </div>
          <p className="mt-8 font-serif text-[11px] tracking-[0.26em] text-charcoal-mute">WOVEN IN BHARAT · FOR EVERY CONVERSATION WORTH KEEPING</p>
        </motion.div>
      </section>

      <footer className="border-t copper-rule py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center">
          <p className="font-serif text-[13px] tracking-[0.2em] text-charcoal-mute">VAANI — THE GENTLE MESSENGER</p>
          <p className="text-[11px] text-charcoal-mute/70">© {new Date().getFullYear()} · neem · turmeric · copper · sandalwood</p>
        </div>
      </footer>
    </div>
  );
}
