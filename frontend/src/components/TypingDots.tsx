/**
 * The three-dot typing indicator.
 *
 * Rendered with `aria-hidden` because the surrounding live region already carries the text
 * a screen reader should announce; two copies of the same fact is just noise.
 *
 * Stagger comes from inline `animationDelay` rather than a Tailwind arbitrary value per dot,
 * so the three children stay identical and the timing lives in one place.
 */
export function TypingDots() {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
