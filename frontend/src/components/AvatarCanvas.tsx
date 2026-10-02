import { useCallback, useState } from "react";
import { resolveAvatarFormat, resolveLive2dModelUrl } from "../lib/avatarFormat";
import type { Emotion } from "../lib/protocol";
import { Live2DStage } from "./Live2DStage";

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

const AVATAR_FORMAT = resolveAvatarFormat(import.meta.env);
const LIVE2D_MODEL_URL = resolveLive2dModelUrl(import.meta.env);

export function AvatarCanvas({
  emotion,
  analyser,
}: {
  emotion: Emotion;
  analyser: AnalyserNode | null;
}) {
  // Amplitude drives the mouth once lip sync lands; the node is plumbed all the way
  // here already, so nothing above needs to change when that happens.
  void analyser;

  const [live2dError, setLive2dError] = useState<string | null>(null);
  const handleFailure = useCallback((message: string) => setLive2dError(message), []);

  if (AVATAR_FORMAT === "live2d" && live2dError === null) {
    return <Live2DStage modelUrl={LIVE2D_MODEL_URL} onFailure={handleFailure} />;
  }

  return (
    <div className="flex h-32 w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60">
      <span className="text-5xl" title={emotion}>
        {GLYPH[emotion] ?? "😐"}
      </span>
      <p className="ml-3 max-w-xs text-xs text-neutral-500">
        {live2dError
          ? `avatar Live2D gagal dimuat, chat & suara tetap jalan. ${live2dError}`
          : "avatar offline, chat & suara tetap jalan"}
      </p>
    </div>
  );
}
