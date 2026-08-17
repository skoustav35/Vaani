import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Mail } from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';
import VaaniMark from '../components/VaaniMark';
import GoogleIcon from '../components/GoogleIcon';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const dest = location.state?.from || '/app';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { if (!loading && user) navigate(dest, { replace: true }); }, [user, loading, dest, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Write a true email address');
    if (password.length < 6) return setError('The secret word needs 6+ characters');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice('Your thread is kindled. Signing you in…');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The gate did not open');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-sandalwood px-4 dark:bg-midnight">
      {/* ambient copper mandala */}
      <svg viewBox="-500 -500 1000 1000" className="pointer-events-none absolute -left-[20vmin] -top-[24vmin] h-[86vmin] w-[86vmin] text-copper opacity-[0.13] animate-mandala-spin" style={{ animationDuration: '60s' }}>
        {[420, 340, 250, 160].map((r, i) => (
          <circle key={r} r={r} fill="none" stroke="currentColor" strokeWidth={i % 2 ? 1 : 2} strokeDasharray={i % 2 ? '3 8' : undefined} />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <ellipse key={i} cx="0" cy="-300" rx="26" ry="60" fill="none" stroke="currentColor" strokeWidth="1.4" transform={`rotate(${i * 22.5})`} />
        ))}
      </svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <VaaniMark size={64} />
          <h1 className="mt-4 font-serif text-[30px] leading-none text-neem-deep dark:text-glow">Vaani</h1>
          <p className="mt-2 max-w-[300px] font-serif text-[13px] italic leading-relaxed text-copper dark:text-glow-dim">
            “Speak gently, arrive instantly — the messenger of the ashram court.”
          </p>
        </div>

        <div className="rounded-[26px] ayur-glass p-7 shadow-lift">
          <h2 className="font-serif text-[19px] text-charcoal dark:text-[#efe6d2]">
            {mode === 'signin' ? 'Return to your circles' : 'Take your first thread'}
          </h2>

          <button
            onClick={() => signInWithGoogle('Vaani')}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-neem py-3 text-[14px] font-semibold text-cream shadow-soft transition hover:bg-neem-deep hover:shadow-turmeric"
          >
            <GoogleIcon size={17} /> Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 font-serif text-[10.5px] uppercase tracking-[0.24em] text-charcoal-mute">
            <span className="h-px flex-1 copper-rule border-t" /> or by letter <span className="h-px flex-1 copper-rule border-t" />
          </div>

          <form onSubmit={submit} className="space-y-3" noValidate>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required
              placeholder="you@ashram.in"
              className="w-full rounded-xl border border-copper/35 bg-white/85 px-4 py-3 text-[14px] text-charcoal placeholder:text-charcoal-mute/60 focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700 dark:text-[#efe6d2]"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required
              placeholder="your secret word"
              className="w-full rounded-xl border border-copper/35 bg-white/85 px-4 py-3 text-[14px] text-charcoal placeholder:text-charcoal-mute/60 focus:border-turmeric focus:outline-none focus:ring-2 focus:ring-turmeric/30 dark:border-midnight-600 dark:bg-midnight-700 dark:text-[#efe6d2]"
            />
            {error && <p className="rounded-lg bg-red-900/10 px-3.5 py-2.5 text-[12.5px] font-medium text-red-800 dark:text-red-300">{error}</p>}
            {notice && <p className="rounded-lg bg-neem-mist px-3.5 py-2.5 text-[12.5px] font-medium text-neem-deep dark:bg-neem/25 dark:text-glow">{notice}</p>}
            <button
              type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-turmeric py-3 text-[14px] font-bold text-charcoal shadow-turmeric transition hover:brightness-105 disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {mode === 'signin' ? 'Enter Vaani' : 'Kindle my thread'}
            </button>
          </form>

          <p className="mt-4 text-center text-[12.5px] text-charcoal-mute dark:text-glow-dim">
            {mode === 'signin' ? 'New to the court?' : 'Already sworn in?'}{' '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }} className="font-semibold text-copper underline decoration-turmeric/60 decoration-2 underline-offset-4 hover:text-turmeric-deep dark:text-glow">
              {mode === 'signin' ? 'Take a thread' : 'Enter instead'}
            </button>
          </p>

          <div className="mt-4 rounded-xl border border-dashed border-turmeric/60 bg-turmeric/10 px-4 py-3 text-center text-[12px] text-charcoal-soft dark:text-glow-dim">
            Demo: <span className="font-mono font-semibold">demo@triveni.app</span> · <span className="font-mono font-semibold">password123</span>
          </div>
        </div>

        <p className="mt-6 text-center font-serif text-[10.5px] tracking-[0.26em] text-charcoal-mute dark:text-glow-dim/70">
          NEEM · TURMERIC · COPPER · SANDALWOOD
        </p>
      </motion.div>
    </div>
  );
}
