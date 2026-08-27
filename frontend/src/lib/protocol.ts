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
  | { type: "error"; message: string };

// Header audio biner: [seq u32 LE][len u32 LE][payload]
export const HEADER_BYTES = 8;
