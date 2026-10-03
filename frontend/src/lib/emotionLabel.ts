import type { Emotion } from "./protocol";

/**
 * Indonesian names for every emotion on the wire.
 *
 * The protocol stays English because it is a machine contract shared with the gateway and
 * ai-service, but the product speaks Indonesian, so the raw token never reaches the screen.
 */
const LABEL: Record<Emotion, string> = {
  netral: "Netral",
  happy: "Senang",
  sad: "Sedih",
  angry: "Marah",
  excited: "Terbakar",
  calm: "Tenang",
  nervous: "Gugup",
  confident: "Percaya diri",
  surprised: "Kaget",
  satisfied: "Puas",
  delighted: "Senang banget",
  scared: "Takut",
  worried: "Khawatir",
  upset: "Kesal",
  frustrated: "Frustrasi",
  depressed: "Murung",
  empathetic: "Empati",
  embarrassed: "Bunga malu",
  disgusted: "Najis",
  moved: "Tersentuh",
  proud: "Bangga",
  relaxed: "Santai",
  grateful: "Bersyukur",
  curious: "Penasaran",
  sarcastic: "Sarkastik",
};

/**
 * Emotions that read as charged rather than level.
 *
 * The panel and the chat bubble tint on these so the persona state is visible without the
 * user having to read the label. Purely presentational: it never changes what is sent.
 */
const EMPHASISED: ReadonlySet<Emotion> = new Set<Emotion>([
  "happy",
  "delighted",
  "excited",
  "sarcastic",
  "angry",
  "frustrated",
  "upset",
  "sad",
  "depressed",
  "worried",
  "scared",
  "nervous",
  "embarrassed",
]);

/** Indonesian label for an emotion, falling back to the token if the type is widened. */
export function emotionLabel(emotion: Emotion): string {
  return LABEL[emotion] ?? emotion;
}

/** Whether the emotion warrants the accent treatment. */
export function isEmphasised(emotion: Emotion): boolean {
  return EMPHASISED.has(emotion);
}
