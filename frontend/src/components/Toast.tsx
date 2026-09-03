export function Toast({ items }: { items: { id: number; text: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
      {items.map((x) => (
        <div
          key={x.id}
          className="max-w-sm rounded-lg border border-red-800 bg-red-900/90 px-4 py-2 text-sm text-red-100 shadow-lg backdrop-blur"
        >
          {x.text}
        </div>
      ))}
    </div>
  );
}
