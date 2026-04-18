import type { Metadata } from 'next';
import HazardStripe from '@/components/HazardStripe';
import GrainOverlay from '@/components/GrainOverlay';

export const metadata: Metadata = {
  title: 'Privacy Policy — Mogster',
  description:
    'How Mogster collects, uses, and protects your data. GDPR and CCPA covered.',
};

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen bg-hazard-yellow">
      <GrainOverlay />

      <HazardStripe height="sm" label="⚠ PRIVACY POLICY ⚠" />

      <div className="relative z-10">
        <div className="px-6 pt-6">
          <a
            href="/"
            className="font-display uppercase tracking-tight text-ink text-2xl hover:underline"
          >
            ← MOGSTER
          </a>
        </div>

        <article className="relative z-10 max-w-2xl mx-auto my-12 p-8 bg-cream text-ink border-2 border-ink font-body leading-relaxed">
          <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-none">
            PRIVACY POLICY
          </h1>
          <p className="mt-2 font-mono text-sm">Effective 2026-04-18</p>

          <h2 className="font-display text-2xl mt-8 mb-2">Who runs Mogster</h2>
          <p>
            Mogster is built and operated by Grgur Damiani, an individual
            developer based in Croatia. If you need to reach a human, email{' '}
            <a
              href="mailto:support@mogster.app"
              className="underline"
            >
              support@mogster.app
            </a>
            .
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">What we collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Email addresses — for the waitlist on mogster.app, and for account
              creation in the app.
            </li>
            <li>
              Passwords — hashed by Supabase Auth. We never see the plaintext.
            </li>
            <li>
              Selfie images you upload for aura rating, stored in Supabase
              Storage.
            </li>
            <li>
              Aura history — scores, paths you chose, and timestamps, stored in
              Supabase Postgres.
            </li>
            <li>
              Device and usage metadata that Supabase Auth captures (IP address,
              user agent, session timestamps).
            </li>
            <li>
              Standard web analytics logged by Vercel — aggregate only, no
              individual tracking beyond what Vercel provides by default.
            </li>
          </ul>

          <h2 className="font-display text-2xl mt-8 mb-2">
            Why we collect it
          </h2>
          <p>
            To provide the service: authenticate users, generate aura ratings
            with AI, show leaderboards and battles, and notify you about launch
            updates if you joined the waitlist. That&apos;s it.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">
            Who we share it with (subprocessors)
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> — auth, database, and storage —{' '}
              supabase.com
            </li>
            <li>
              <strong>Google Gemini</strong> — the AI model that generates aura
              ratings and roasts — ai.google.dev
            </li>
            <li>
              <strong>Upstash Redis</strong> — rate limiting — upstash.com
            </li>
            <li>
              <strong>Railway</strong> — API hosting — railway.app
            </li>
            <li>
              <strong>Cloudflare</strong> — domain DNS and email forwarding —
              cloudflare.com
            </li>
            <li>
              <strong>Vercel</strong> — web hosting for mogster.app — vercel.com
            </li>
          </ul>
          <p className="mt-4">
            We do not sell your data and we do not share it with third parties
            for advertising. The list above is the full set of subprocessors.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">
            How long we keep it
          </h2>
          <p>
            While your account is active, plus 30 days after deletion (for
            backup rotation). Waitlist emails are kept until we notify you at
            launch or you unsubscribe, whichever comes first.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">
            Your rights (GDPR, for EU users)
          </h2>
          <p>
            If you&apos;re in the EU, GDPR gives you the right to access the
            data we hold on you, rectify anything that&apos;s wrong, erase your
            data, request a portable copy, object to processing, and restrict
            processing in certain cases. To exercise any of these, email{' '}
            <a
              href="mailto:support@mogster.app"
              className="underline"
            >
              support@mogster.app
            </a>
            . We&apos;ll respond within 30 days.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">
            Your rights (CCPA, for California residents)
          </h2>
          <p>
            If you&apos;re a California resident, you have the right to know
            what data we collect, to have it deleted, and to opt out of the
            &quot;sale&quot; of personal information. We don&apos;t sell data,
            but the right exists regardless. Same contact:{' '}
            <a
              href="mailto:support@mogster.app"
              className="underline"
            >
              support@mogster.app
            </a>
            .
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">Age restriction</h2>
          <p>
            Mogster is for users 13 and older. If you&apos;re under 13, please
            don&apos;t create an account. If you think a child under 13 has
            created an account, email support@mogster.app and we&apos;ll remove
            it.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">Data location</h2>
          <p>
            Data is processed primarily in the EU (Supabase EU region) and in
            the US (Vercel edge, Cloudflare). By using Mogster you consent to
            data processing in both jurisdictions.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">
            Changes to this policy
          </h2>
          <p>
            We&apos;ll update this page and bump the effective date when things
            change. If the changes are material — new subprocessors, new data
            types — we&apos;ll notify users by email.
          </p>

          <h2 className="font-display text-2xl mt-8 mb-2">Contact</h2>
          <p>
            <a
              href="mailto:support@mogster.app"
              className="underline"
            >
              support@mogster.app
            </a>
            . Postal mail is not currently offered; email is the only contact
            channel.
          </p>
        </article>
      </div>
    </main>
  );
}
