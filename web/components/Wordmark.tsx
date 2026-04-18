/**
 * Wordmark — the MOGSTER brand mark in Anton, all-caps, with a tight track
 * and the signature hazard-yellow period. Renders a <span> so it composes
 * inside any wrapping tag the consumer chooses.
 */
interface WordmarkProps {
  /** 'lg' (default) for hero, 'sm' for inline headers (e.g. /privacy back-link). */
  size?: 'sm' | 'lg';
  className?: string;
}

export default function Wordmark({ size = 'lg', className }: WordmarkProps) {
  const sizeClass =
    size === 'lg'
      ? 'text-7xl md:text-8xl'
      : 'text-3xl';

  return (
    <span
      className={`font-display uppercase tracking-tight text-ink leading-none inline-block ${sizeClass}${
        className ? ` ${className}` : ''
      }`}
    >
      MOGSTER<span className="text-hazard-yellow">.</span>
    </span>
  );
}
