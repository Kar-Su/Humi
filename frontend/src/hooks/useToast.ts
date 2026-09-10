import { useCallback, useRef, useState } from "react";

type Item = { id: number; text: string };

export function useToast() {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(0);
  const show = useCallback((text: string, ms = 3000) => {
    const id = next.current++;
    setItems((prev) => [...prev, { id, text }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), ms);
  }, []);
  return { items, show };
}
