import type { Emotion } from "../lib/protocol";

export function AvatarCanvas({
  emotion,
  analyser: _analyser,
}: {
  emotion: Emotion;
  analyser: AnalyserNode | null;
}) {
  void _analyser;
  const glyph: Record<Emotion, string> = {
    senang: "😊",
    sedih: "😢",
    kaget: "😲",
    penasaran: "🤔",
    netral: "😐",
  };
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 text-5xl">
      <span title={emotion}>{glyph[emotion] ?? "😐"}</span>
      <span className="ml-3 text-sm text-neutral-500">
        avatar 3D offline - chat & suara tetap jalan
      </span>
    </div>
  );
}
