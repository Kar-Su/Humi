import { useCallback, useState } from "react";
import { resolveAvatarFormat, resolveLive2dModelUrl } from "../lib/avatarFormat";
import { emotionLabel } from "../lib/emotionLabel";
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
  speaking,
}: {
  emotion: Emotion;
  analyser: AnalyserNode | null;
  /** Drives the panel ring, so the state is visible even when the model faces away. */
  speaking: boolean;
}) {
  // Amplitude drives the mouth once lip sync lands; the node is plumbed all the way
  // here already, so nothing above needs to change when that happens.
  void analyser;

  const [live2dError, setLive2dError] = useState<string | null>(null);
  const handleFailure = useCallback((message: string) => setLive2dError(message), []);

  const ring = speaking ? "border-live" : "border-line";
  const badge = speaking ? "bg-live text-live-ink" : "bg-raised text-ink-subtle";

  if (AVATAR_FORMAT === "live2d" && live2dError === null) {
    return (
      <section
        className={`relative flex min-h-0 flex-col overflow-hidden rounded-lg border ${ring} bg-panel transition-colors duration-200`}
      >
        <Live2DStage modelUrl={LIVE2D_MODEL_URL} onFailure={handleFailure} />
        <span
          className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-caption font-medium ${badge}`}
        >
          {emotionLabel(emotion)}
        </span>
        {speaking && (
          <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-live/40" />
        )}
      </section>
    );
  }

  return (
    <section
      className={`relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg border ${ring} bg-panel transition-colors duration-200`}
    >
      <span className="text-7xl" role="img" aria-label={`Ekspresi ${emotionLabel(emotion)}`}>
        {GLYPH[emotion] ?? "😐"}
      </span>
      <span
        className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-caption font-medium ${badge}`}
      >
        {emotionLabel(emotion)}
      </span>
      <p className="absolute inset-x-3 bottom-3 rounded-sm bg-canvas/80 px-3 py-2 text-caption text-ink-muted backdrop-blur-sm">
        {live2dError
          ? `Avatar Live2D gagal dimuat, chat dan suara tetap jalan. ${live2dError}`
          : "Avatar offline, chat dan suara tetap jalan."}
      </p>
    </section>
  );
}
