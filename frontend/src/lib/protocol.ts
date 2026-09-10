// Kontrak pesan WebSocket Humi. Sinkron dengan skill protocol-contract,
// gateway/internal/protocol/protocol.go, dan ai-service/app/protocol.py.

export const EMOTIONS = ["netral", "senang", "sedih", "kaget", "penasaran"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export type Inbound =
  | { type: "text"; text: string }
  | { type: "audio_start"; format: string; sample_rate: number }
  | { type: "audio_chunk"; seq: number }
  | { type: "audio_end" }
  | { type: "interrupt" };

export type Outbound =
  | { type: "session_ready"; config: { model: string; voice: string } }
  | { type: "stt_final"; text: string }
  | { type: "llm_sentence"; seq: number; text: string; emotion: Emotion }
  | { type: "tts_start"; seq: number; format: string; sample_rate: number }
  | { type: "tts_end"; seq: number }
  | { type: "turn_end" }
  | { type: "error"; message: string }
  | { type: "pong" };

// Header audio biner: [seq u32 LE][len u32 LE][payload]
export const HEADER_BYTES = 8;

export function isValidEmotion(e: string): e is Emotion {
  return (EMOTIONS as readonly string[]).includes(e);
}

export function packAudio(seq: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(HEADER_BYTES + payload.length);
  const view = new DataView(frame.buffer);
  view.setUint32(0, seq >>> 0, true);
  view.setUint32(4, payload.length >>> 0, true);
  frame.set(payload, HEADER_BYTES);
  return frame;
}

export function unpackAudio(frame: Uint8Array): { seq: number; payload: Uint8Array } {
  if (frame.length < HEADER_BYTES)
    throw new Error(`truncated header: got ${frame.length}, need ${HEADER_BYTES}`);
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const seq = view.getUint32(0, true);
  const len = view.getUint32(4, true);
  if (frame.length < HEADER_BYTES + len)
    throw new Error(
      `truncated payload: header claims ${len}, frame has ${frame.length - HEADER_BYTES}`,
    );
  return { seq, payload: frame.slice(HEADER_BYTES, HEADER_BYTES + len) };
}
