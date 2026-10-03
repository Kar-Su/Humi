/**
 * Transient error notices.
 *
 * `role="alert"` because these report a failed send or a dropped socket, and interrupting the
 * screen reader is the point. The container is `aria-live="polite"` rather than assertive
 * because several toasts can appear together on reconnect.
 */
export function Toast({ items }: { items: { id: number; text: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed top-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 sm:top-4 sm:right-4"
      aria-live="polite"
    >
      {items.map((x) => (
        <div
          key={x.id}
          role="alert"
          className="pointer-events-auto rounded-md border border-bad/40 bg-bad px-4 py-2.5 text-body-sm text-canvas shadow-lg"
        >
          {x.text}
        </div>
      ))}
    </div>
  );
}
