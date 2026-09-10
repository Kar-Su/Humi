import type { Emotion } from "../lib/protocol";

const GLYPH: Record<Emotion, string> = {
  netral: "😐",
  happy: "😊",
  sad: "😢",
  angry: "😠",
  excited: "🤩",
  calm: "😌",
  nervous: "😰",
  confident: "😎",
  surprised: "😲",
  satisfied: "😌",
  delighted: "🥰",
  scared: "😨",
  worried: "😟",
  upset: "😠",
  frustrated: "😤",
  depressed: "😞",
  empathetic: "🥺",
  embarrassed: "😳",
  disgusted: "🤢",
  moved: "🥹",
  proud: "😏",
  relaxed: "😌",
  grateful: "🙏",
  curious: "🤔",
  sarcastic: "😏",
};

export function AvatarCanvas({
  emotion,
  analyser: _analyser,
}: {
  emotion: Emotion;
  analyser: AnalyserNode | null;
}) {
  void _analyser;
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 text-5xl">
      <span title={emotion}>{GLYPH[emotion] ?? "😐"}</span>
      <span className="ml-3 text-sm text-neutral-500">avatar offline - chat & suara jalan</span>
    </div>
  );
}
