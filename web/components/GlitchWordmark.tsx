'use client';

import { useEffect, useRef } from 'react';

/**
 * Hero MOGSTER wordmark with a recurring electric-flicker strike. The CSS
 * animation runs once on mount; this component then re-triggers it at
 * random 2.5–6s intervals by resetting the `animation` inline style and
 * forcing a reflow. Skipped under prefers-reduced-motion.
 *
 * The text is painted at its final position from frame 1 (opacity starts
 * and ends at 1), so LCP is unaffected — strikes only dip through 0 briefly.
 */
interface GlitchWordmarkProps {
  className?: string;
}

export default function GlitchWordmark({ className }: GlitchWordmarkProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 2500 + Math.random() * 3500;
      timer = setTimeout(() => {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <span
      className={`font-display uppercase tracking-tight text-ink leading-none inline-block text-7xl md:text-8xl${
        className ? ` ${className}` : ''
      }`}
    >
      <span ref={ref} className="mogster-glitch">MOGSTER</span>
      <span>.</span>
    </span>
  );
}
