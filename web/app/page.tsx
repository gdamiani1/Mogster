import HazardStripe from '@/components/HazardStripe';
import GrainOverlay from '@/components/GrainOverlay';
import Wordmark from '@/components/Wordmark';
import { WaitlistForm } from '@/components/WaitlistForm';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-hazard-yellow flex flex-col">
      <GrainOverlay />

      <HazardStripe label="⚠ AURA MEASUREMENT STATION ⚠" height="md" />

      <div className="relative z-10 flex-1 px-6 pt-16 pb-12 md:pt-24">
        <div className="mx-auto w-full max-w-2xl">
          <Wordmark size="lg" className="block text-center" />

          <h1 className="mt-10 font-display text-5xl md:text-6xl text-ink text-center tracking-tight leading-tight">
            <span className="block">YOUR AURA.</span>
            <span className="block">RATED.</span>
            <span className="block">NO CAP.</span>
          </h1>

          <div className="mt-10 text-center font-mono text-base md:text-lg text-ink">
            <p className="mx-auto max-w-prose">
              AI rates your aura. Chat roasts you. Mog your friends on the
              leaderboard.
            </p>
            <p className="mx-auto mt-4 max-w-prose">
              TestFlight rolling out. App Store soon.
            </p>
          </div>

          <div className="mt-12 mx-auto w-full max-w-md px-2">
            <WaitlistForm />
          </div>
        </div>
      </div>

      <HazardStripe height="sm" />

      <footer className="relative z-10 py-6 px-6 text-center font-mono text-xs md:text-sm uppercase text-ink">
        <a href="/privacy" className="underline">
          Privacy
        </a>
        <span aria-hidden="true"> · </span>
        <a href="/terms" className="underline">
          Terms
        </a>
        <span aria-hidden="true"> · </span>
        <a href="mailto:support@mogster.app" className="underline">
          Support
        </a>
      </footer>
    </main>
  );
}
