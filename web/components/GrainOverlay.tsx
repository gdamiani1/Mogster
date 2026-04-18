/**
 * GrainOverlay — full-viewport analog-grain texture.
 *
 * Uses an inline SVG <feTurbulence> filter tinted to greyscale, laid
 * over the page in `multiply` blend mode at low opacity so it darkens
 * without obscuring content. Fixed-positioned + pointer-events: none,
 * so it never intercepts input.
 *
 * Filter id is namespaced (`mogster-grain`) to avoid collisions if the
 * component is ever rendered twice on one page.
 */
export default function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        mixBlendMode: 'multiply',
        opacity: 0.08,
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <filter id="mogster-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={1}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#mogster-grain)" />
      </svg>
    </div>
  );
}
