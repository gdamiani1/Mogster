'use client';

import { useState, type FormEvent } from 'react';
import { getSupabase } from '@/lib/supabase';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DUPLICATE_CODE = '23505';

type Phase = 'idle' | 'sending' | 'success' | 'duplicate';

function isDuplicateError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === DUPLICATE_CODE
  );
}

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!consent) {
      setError('You need to give consent before we can add you.');
      return;
    }
    setError(null);
    setPhase('sending');

    const userAgent =
      typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    try {
      const { error: dbError } = await getSupabase()
        .from('waitlist')
        .insert({ email, user_agent: userAgent });

      if (!dbError) {
        setPhase('success');
        return;
      }

      if (isDuplicateError(dbError)) {
        setPhase('duplicate');
        return;
      }

      setPhase('idle');
      setError('Something went sideways. Try again.');
    } catch {
      setPhase('idle');
      setError('Something went sideways. Try again.');
    }
  }

  if (phase === 'success') {
    return (
      <div
        role="status"
        data-phase="success"
        className="bg-ink p-6 text-cream border-2 border-ink"
      >
        <p className="font-display text-3xl uppercase tracking-wide text-hazard-yellow">
          ☢ LOCKED IN ☢
        </p>
        <p className="mt-2 font-body">
          You&apos;re sigma. See you on launch day.
        </p>
      </div>
    );
  }

  if (phase === 'duplicate') {
    return (
      <div
        role="status"
        data-phase="duplicate"
        className="bg-ink p-6 text-cream border-2 border-hazard-yellow"
      >
        <p className="font-display text-3xl uppercase tracking-wide text-hazard-yellow">
          ⚠ ALREADY ON THE LIST
        </p>
        <p className="mt-2 font-body">We&apos;ll see you on launch day.</p>
      </div>
    );
  }

  const sending = phase === 'sending';

  return (
    <form onSubmit={submit} noValidate className="font-body">
      <label className="block">
        <span className="block font-display uppercase tracking-wide">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? 'true' : undefined}
          required
          className="w-full border-2 border-ink bg-cream px-3 py-2"
        />
      </label>
      <label className="mt-3 flex items-start gap-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span>Notify me when Mogster launches. I can unsubscribe anytime.</span>
      </label>
      {error && (
        <p role="alert" className="mt-3 font-mono text-sm text-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        data-phase={phase}
        disabled={sending}
        aria-busy={sending ? 'true' : undefined}
        className="mt-4 w-full bg-ink px-4 py-3 font-display uppercase tracking-wide text-hazard-yellow disabled:opacity-60"
      >
        {sending ? 'SENDING…' : 'LOCK ME IN →'}
      </button>
    </form>
  );
}
