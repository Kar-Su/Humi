// Package protocol memuat kontrak pesan WebSocket Humi.
// Sinkron dengan: skill protocol-contract, ai-service/app/protocol.py,
// dan frontend/src/lib/protocol.ts. Ubah SEMUA dalam satu commit.
package protocol

import "encoding/binary"

// Tipe pesan client -> server.
const (
	TypeText       = "text"
	TypeAudioStart = "audio_start"
	TypeAudioChunk = "audio_chunk"
	TypeAudioEnd   = "audio_end"
	TypeInterrupt  = "interrupt"
)

// Tipe pesan server -> client.
const (
	TypeSessionReady = "session_ready"
	TypeSttFinal     = "stt_final"
	TypeLlmSentence  = "llm_sentence"
	TypeTtsStart     = "tts_start"
	TypeTtsEnd       = "tts_end"
	TypeTurnEnd      = "turn_end"
	TypeError        = "error"
)

// Emosi yang dikenali (kamus di skill persona-prompting).
const (
	EmotionNetral    = "netral"
	EmotionSenang    = "senang"
	EmotionSedih     = "sedih"
	EmotionKaget     = "kaget"
	EmotionPenasaran = "penasaran"
)

// Header audio biner: [seq u32 LE][len u32 LE][payload].
const HeaderBytes = 8

// PackAudio membungkus payload PCM menjadi frame biner.
func PackAudio(seq uint32, payload []byte) []byte {
	frame := make([]byte, HeaderBytes+len(payload))
	binary.LittleEndian.PutUint32(frame[0:4], seq)
	binary.LittleEndian.PutUint32(frame[4:8], uint32(len(payload)))
	copy(frame[HeaderBytes:], payload)
	return frame
}
