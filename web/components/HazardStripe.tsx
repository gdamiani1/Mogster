import type { CSSProperties } from 'react';

/**
 * HazardStripe — industrial black-and-yellow diagonal stripe used as section
 * dividers / page headers. Mirrors the hazard-tape aesthetic of the Mogster
 * app. Optional centered label renders on a solid hazard-yellow rectangle
 * for a "caution label" effect.
 */
interface HazardStripeProps {
  /** Optional centered caption, rendered in all-caps Anton. */
  label?: string;
  /** Bar height. 'sm' ~24px for page-header stripes, 'md' ~48px for section breaks. */
  height?: 'sm' | 'md';
  /** Extra classes for the outer wrapper. */
  className?: string;
}

const stripePattern: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, var(--color-ink) 0 12px, var(--color-hazard-yellow) 12px 24px)',
};

export default function HazardStripe({
  label,
  height = 'md',
  className,
}: HazardStripeProps) {
  const heightClass = height === 'sm' ? 'h-6' : 'h-12';
  const baseClass = `relative w-full overflow-hidden ${heightClass}${
    className ? ` ${className}` : ''
  }`;

  if (label) {
    return (
      <div
        role="separator"
        aria-label={label}
        className={baseClass}
        style={stripePattern}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`bg-hazard-yellow text-ink font-display uppercase tracking-wide px-4 py-1 border-2 border-ink whitespace-nowrap ${
              height === 'sm' ? 'text-sm' : 'text-lg md:text-xl'
            }`}
          >
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-hidden="true"
      className={baseClass}
      style={stripePattern}
    />
  );
}
